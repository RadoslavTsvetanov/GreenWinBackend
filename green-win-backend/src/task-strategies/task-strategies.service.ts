import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TaskStrategy } from './entities/task-strategy.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskExecution } from '../task-executions/entities/task-execution.entity';
import { ExecutionStatus } from '../task-executions/enums/execution.enums';
import { CreateTaskStrategyDto } from './dto/create-task-strategy.dto';
import { Periodicity } from './enums/firing-strategy.enum';
import { TaskStatus } from '../tasks/enums/task.enums';
import { LambdaService, LambdaInvocationResult } from '../lambda/lambda.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { PredictionService } from '../prediction/prediction.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class TaskStrategiesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskStrategiesService.name);

  constructor(
    @InjectRepository(TaskStrategy)
    private readonly strategyRepository: Repository<TaskStrategy>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskExecution)
    private readonly executionRepository: Repository<TaskExecution>,
    private readonly lambdaService: LambdaService,
    private readonly schedulerService: SchedulerService,
    private readonly predictionService: PredictionService,
    private readonly organizationsService: OrganizationsService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.recoverActiveStrategies();
    } catch (err: any) {
      this.logger.error(`Strategy recovery failed: ${err.message}`, err.stack);
    }
  }

  private async recoverActiveStrategies(): Promise<void> {
    const { affected } = await this.tasksRepository.update(
      { status: TaskStatus.RUNNING },
      { status: TaskStatus.FAILED },
    );
    if (affected) {
      this.logger.warn(`[RECOVERY] Reset ${affected} crashed RUNNING task(s) to FAILED`);
    }

    const active = await this.strategyRepository.find({
      where: { isActive: true },
      relations: ['task', 'task.owner', 'task.project', 'task.project.organization'],
    });

    if (!active.length) {
      this.logger.log('[RECOVERY] No active strategies to restore');
      return;
    }

    let restored = 0;
    for (const strategy of active) {
      if (!strategy.task) {
        this.logger.warn(
          `[RECOVERY] Strategy ${strategy.id} has no task — skipping`,
        );
        continue;
      }
      try {
        await this.scheduleStrategy(strategy);
        this.logger.log(
          `[RECOVERY] Restored cron for strategy ${strategy.id} (${strategy.periodicity})`,
        );
        restored++;
      } catch (err: any) {
        this.logger.error(
          `[RECOVERY] Failed to restore strategy ${strategy.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log(`[RECOVERY] Restored ${restored}/${active.length} active strategies`);
  }

  async findAll(): Promise<TaskStrategy[]> {
    return this.strategyRepository.find({ relations: ['task'] });
  }

  async findOne(id: string): Promise<TaskStrategy> {
    const strategy = await this.strategyRepository.findOne({
      where: { id },
      relations: ['task', 'task.owner', 'task.project', 'task.project.organization'],
    });
    if (!strategy) throw new NotFoundException(`TaskStrategy ${id} not found`);
    return strategy;
  }

  async findByTask(taskId: string): Promise<TaskStrategy[]> {
    return this.strategyRepository.find({
      where: { task: { id: taskId } },
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: CreateTaskStrategyDto): Promise<TaskStrategy> {
    const task = await this.tasksRepository.findOne({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException(`Task ${dto.taskId} not found`);

    this.validateStrategyFields(dto);

    const strategy = this.strategyRepository.create({
      task,
      periodicity: dto.periodicity,
      times: dto.times,
      timeRanges: dto.timeRanges,
      executionTime: dto.executionTime,
      dayOfWeek: dto.dayOfWeek,
      dayOfMonth: dto.dayOfMonth,
      cronExpression: dto.cronExpression,
    });
    return this.strategyRepository.save(strategy);
  }

  async remove(id: string): Promise<void> {
    const strategy = await this.findOne(id);
    if (strategy.isActive) {
      throw new BadRequestException('Deactivate the strategy before deleting it');
    }
    await this.strategyRepository.remove(strategy);
  }

  async activate(
    id: string,
    parameters?: Record<string, any>,
  ): Promise<TaskStrategy> {
    const strategy = await this.findOne(id);

    if (strategy.isActive) {
      throw new BadRequestException('Strategy is already active');
    }

    strategy.parameters = parameters ?? strategy.parameters;
    strategy.isActive = true;
    strategy.activatedAt = new Date();

    if (strategy.periodicity === Periodicity.ONCE) {
      const functionName = this.buildFunctionName(strategy.task);
      this.logger.log(`[activate] ONCE — functionName=${functionName}, task.owner=${strategy.task?.owner?.id}, task.project=${strategy.task?.project?.id}`);
      try {
        const result = await this.lambdaService.invokeGreenHandler(functionName, strategy.parameters ?? undefined);
        strategy.lastFiredAt = new Date();
        strategy.isActive = false;
        await this.recordInvocation(strategy, result);
        return this.strategyRepository.save(strategy);
      } catch (err: any) {
        this.logger.error(`[activate] ONCE invocation failed: ${err?.message}`, err?.stack);
        strategy.isActive = false;
        await this.strategyRepository.save(strategy);
        throw new InternalServerErrorException(`Lambda invocation failed: ${err?.message}`);
      }
    }

    await this.scheduleStrategy(strategy);
    return this.strategyRepository.save(strategy);
  }

  async deactivate(id: string): Promise<TaskStrategy> {
    const strategy = await this.findOne(id);

    if (!strategy.isActive) {
      throw new BadRequestException('Strategy is not active');
    }

    this.removeAllCronJobsForStrategy(strategy);
    strategy.isActive = false;
    return this.strategyRepository.save(strategy);
  }

  async invoke(
    id: string,
    parameters?: Record<string, any>,
  ): Promise<{ result: unknown }> {
    const strategy = await this.findOne(id);

    const functionName = this.buildFunctionName(strategy.task);
    const payload = { ...strategy.parameters, ...parameters };

    this.logger.log(`Manual invocation of ${functionName} on greenest server`);
    const result = await this.lambdaService.invokeGreenHandler(functionName, payload);

    strategy.lastFiredAt = new Date();
    await this.strategyRepository.save(strategy);
    await this.recordInvocation(strategy, result);

    return { result: result.payload };
  }

  async deactivateAllForTask(taskId: string): Promise<void> {
    const active = await this.strategyRepository.find({
      where: { task: { id: taskId }, isActive: true },
    });
    for (const s of active) {
      this.removeAllCronJobsForStrategy(s);
      s.isActive = false;
    }
    if (active.length) await this.strategyRepository.save(active);
  }

  private async scheduleStrategy(strategy: TaskStrategy): Promise<void> {
    const functionName = this.buildFunctionName(strategy.task);
    const onSuccess = async (result: LambdaInvocationResult): Promise<void> => {
      await this.recordInvocation(strategy, result);
    };

    if (strategy.cronExpression) {
      this.schedulerService.scheduleLambdaCall({
        jobId: strategy.id,
        functionName,
        cronExpression: strategy.cronExpression,
        payload: strategy.parameters,
        onSuccess,
      });
      return;
    }

    switch (strategy.periodicity) {
      case Periodicity.DAILY:
        await this.scheduleDailyStrategy(strategy, functionName, onSuccess);
        break;
      case Periodicity.WEEKLY:
        await this.scheduleWeeklyOrMonthly(strategy, functionName, onSuccess);
        break;
      case Periodicity.MONTHLY:
        await this.scheduleWeeklyOrMonthly(strategy, functionName, onSuccess);
        break;
      case Periodicity.ONCE:
        break;
    }
  }

  private async scheduleDailyStrategy(
    strategy: TaskStrategy,
    functionName: string,
    onSuccess: (result: LambdaInvocationResult) => Promise<void>,
  ): Promise<void> {
    if (strategy.times?.length) {
      for (let i = 0; i < strategy.times.length; i++) {
        const [hour, minute] = strategy.times[i].split(':').map(Number);
        this.schedulerService.scheduleLambdaCall({
          jobId: `${strategy.id}:${i}`,
          functionName,
          cronExpression: `${minute} ${hour} * * *`,
          payload: strategy.parameters,
          onSuccess,
        });
        this.logger.log(`Scheduled daily job ${strategy.id}:${i} at ${strategy.times[i]} UTC`);
      }
      return;
    }

    if (strategy.timeRanges?.length) {
      for (let i = 0; i < strategy.timeRanges.length; i++) {
        const cron = await this.buildCronFromRange(strategy.timeRanges[i], '* * *');
        this.schedulerService.scheduleLambdaCall({
          jobId: `${strategy.id}:range-${i}`,
          functionName,
          cronExpression: cron,
          payload: strategy.parameters,
          onSuccess,
        });
        this.logger.log(
          `Scheduled daily ML-optimized job ${strategy.id}:range-${i} at ${cron}`,
        );
      }
      return;
    }

    throw new BadRequestException(
      'DAILY strategy must have either times or timeRanges',
    );
  }

  private async scheduleWeeklyOrMonthly(
    strategy: TaskStrategy,
    functionName: string,
    onSuccess: (result: LambdaInvocationResult) => Promise<void>,
  ): Promise<void> {
    const dayPart =
      strategy.periodicity === Periodicity.WEEKLY
        ? `* * ${strategy.dayOfWeek ?? 1}`
        : `${strategy.dayOfMonth ?? 1} * *`;

    if (strategy.executionTime) {
      const [hour, minute] = strategy.executionTime.split(':').map(Number);
      this.schedulerService.scheduleLambdaCall({
        jobId: strategy.id,
        functionName,
        cronExpression: `${minute} ${hour} ${dayPart}`,
        payload: strategy.parameters,
        onSuccess,
      });
      this.logger.log(
        `Scheduled ${strategy.periodicity} job ${strategy.id} at ${strategy.executionTime} UTC`,
      );
      return;
    }

    if (strategy.timeRanges?.length) {
      const cron = await this.buildCronFromRange(strategy.timeRanges[0], dayPart);
      this.schedulerService.scheduleLambdaCall({
        jobId: strategy.id,
        functionName,
        cronExpression: cron,
        payload: strategy.parameters,
        onSuccess,
      });
      this.logger.log(
        `Scheduled ${strategy.periodicity} ML-optimized job ${strategy.id} at ${cron}`,
      );
      return;
    }

    throw new BadRequestException(
      `${strategy.periodicity.toUpperCase()} strategy must have either executionTime or timeRanges`,
    );
  }

  private async buildCronFromRange(
    range: { start: string; end: string },
    dayPattern: string,
  ): Promise<string> {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setUTCHours(startH, startM, 0, 0);
    const endDate = new Date(now);
    endDate.setUTCHours(endH, endM, 0, 0);
    if (endDate <= startDate) {
      endDate.setUTCDate(endDate.getUTCDate() + 1);
    }

    const prediction = await this.predictionService.predictOptimalExecutionDate({
      startDate,
      endDate,
    });

    const optHour = prediction.optimalDate.getUTCHours();
    const optMinute = prediction.optimalDate.getUTCMinutes();

    this.logger.log(
      `ML predicted optimal time: ${optHour}:${String(optMinute).padStart(2, '0')} UTC ` +
        `(range: ${range.start}-${range.end}, region: ${prediction.region})`,
    );

    return `${optMinute} ${optHour} ${dayPattern}`;
  }

  private removeAllCronJobsForStrategy(strategy: TaskStrategy): void {
    this.schedulerService.removeCronJob(strategy.id);

    if (strategy.times?.length) {
      for (let i = 0; i < strategy.times.length; i++) {
        this.schedulerService.removeCronJob(`${strategy.id}:${i}`);
      }
    }

    if (strategy.timeRanges?.length) {
      for (let i = 0; i < strategy.timeRanges.length; i++) {
        this.schedulerService.removeCronJob(`${strategy.id}:range-${i}`);
      }
    }
  }

  private buildFunctionName(task: Task): string {
    const ownerId = (task as any).owner?.id ?? 'default';
    const projectId = (task as any).project?.id ?? 'default';
    const ownerShort = ownerId.substring(0, 8);
    const projShort = projectId.substring(0, 8);
    const workloadName = task.name.replace(/[^a-zA-Z0-9-]/g, '-');
    return `${ownerShort}-${projShort}-${workloadName}`;
  }

   async recordInvocation(
    strategy: TaskStrategy,
    result: LambdaInvocationResult,
  ): Promise<TaskExecution> {
    const now = new Date();
    const durationMs = result.metrics?.durationMs ?? 0;
    const startedAt = new Date(now.getTime() - durationMs);

    const execution = this.executionRepository.create({
      task: strategy.task,
      status: ExecutionStatus.SUCCEEDED,
      provider: 'aws',
      region: result.region,
      scheduledAt: now,
      startedAt,
      finishedAt: now,
      metrics: result.metrics,
    });
    const saved = await this.executionRepository.save(execution);

    const orgId = (strategy.task.project as any)?.organization?.id;
    if (orgId) {
      const emissionsKg = result.metrics.estimatedEmissionsGco2 / 1000;
      await this.organizationsService.updateEmissions(orgId, emissionsKg);
      await this.organizationsService.incrementTasksExecuted(orgId);
    }

    strategy.lastFiredAt = new Date();
    await this.strategyRepository.save(strategy);

    return saved;
  }

  private validateStrategyFields(dto: CreateTaskStrategyDto): void {
    const { periodicity, times, timeRanges, executionTime, dayOfWeek, dayOfMonth, cronExpression } = dto;

    if (cronExpression) return;

    switch (periodicity) {
      case Periodicity.ONCE:
        if (!executionTime && !timeRanges?.length) {
          throw new BadRequestException('ONCE strategy requires executionTime or timeRanges');
        }
        if (times?.length) {
          throw new BadRequestException('ONCE strategy does not support multiple times — use executionTime');
        }
        break;

      case Periodicity.DAILY:
        if (!times?.length && !timeRanges?.length) {
          throw new BadRequestException('DAILY strategy requires times or timeRanges');
        }
        if (executionTime) {
          throw new BadRequestException('DAILY strategy does not use executionTime — use times');
        }
        break;

      case Periodicity.WEEKLY:
        if (!executionTime && !timeRanges?.length) {
          throw new BadRequestException('WEEKLY strategy requires executionTime or timeRanges');
        }
        if (times?.length) {
          throw new BadRequestException('WEEKLY strategy does not support multiple times');
        }
        if (timeRanges && timeRanges.length > 1) {
          throw new BadRequestException('WEEKLY strategy supports only one timeRange');
        }
        if (dayOfWeek === undefined || dayOfWeek === null) {
          throw new BadRequestException('WEEKLY strategy requires dayOfWeek');
        }
        break;

      case Periodicity.MONTHLY:
        if (!executionTime && !timeRanges?.length) {
          throw new BadRequestException('MONTHLY strategy requires executionTime or timeRanges');
        }
        if (times?.length) {
          throw new BadRequestException('MONTHLY strategy does not support multiple times');
        }
        if (timeRanges && timeRanges.length > 1) {
          throw new BadRequestException('MONTHLY strategy supports only one timeRange');
        }
        if (dayOfMonth === undefined || dayOfMonth === null) {
          throw new BadRequestException('MONTHLY strategy requires dayOfMonth');
        }
        break;
    }
  }
}
