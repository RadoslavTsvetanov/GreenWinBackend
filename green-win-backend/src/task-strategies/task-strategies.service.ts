import {
  BadRequestException,
  Injectable,
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
import { EUROPE_AWS_REGION_COUNTRY } from '../carbon/constants/aws-regions';
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

  // ---------------------------------------------------------------------------
  // Startup recovery
  // ---------------------------------------------------------------------------

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
        const functionName = this.buildFunctionName(strategy.task);

        if (strategy.type === FiringStrategy.DAILY_AT_TIMES) {
          this.scheduleAtTimes(strategy, functionName);
        } else if (strategy.type === FiringStrategy.DAILY_IN_RANGE) {
          await this.scheduleInRanges(strategy, functionName);
        } else {
          const { cronExpression } = this.resolveScheduleParams(strategy);
          this.schedulerService.scheduleLambdaCall({
            jobId: strategy.id,
            functionName,
            cronExpression,
            payload: strategy.parameters,
          });
        }
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

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

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

    if (dto.type === FiringStrategy.CUSTOM && !dto.cronExpression) {
      throw new BadRequestException('cronExpression is required for CUSTOM strategies');
    }
    if (dto.type === FiringStrategy.DAILY_AT_TIMES && (!dto.times || !dto.times.length)) {
      throw new BadRequestException('times array is required for DAILY_AT_TIMES strategies');
    }
    if (dto.type === FiringStrategy.DAILY_IN_RANGE && (!dto.timeRanges || !dto.timeRanges.length)) {
      throw new BadRequestException('timeRanges array is required for DAILY_IN_RANGE strategies');
    }
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
      times: dto.times,
      timeRanges: dto.timeRanges,
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

  // ---------------------------------------------------------------------------
  // Activate / Deactivate / Invoke
  // ---------------------------------------------------------------------------

  /**
   * Activate a repeatable strategy — sets up the appropriate cron job(s).
   * For IMMEDIATELY strategies, fires the lambda once on the greenest server.
   */
  async activate(
    id: string,
    parameters?: Record<string, any>,
  ): Promise<TaskStrategy> {
    const strategy = await this.findOne(id);

    if (!strategy.isEnabled) {
      throw new BadRequestException('Strategy is disabled and cannot be activated');
    }

    if (strategy.type === FiringStrategy.IMMEDIATELY) {
      // Fire once immediately on the greenest server
      const functionName = this.buildFunctionName(strategy.task);
      this.logger.log(`Immediate invocation of ${functionName}`);
      await this.lambdaService.invokeGreenHandler(functionName, parameters);
      strategy.lastFiredAt = new Date();
      strategy.parameters = parameters ?? strategy.parameters;
      return this.strategyRepository.save(strategy);
    }

    if (strategy.isActive) {
      throw new BadRequestException('Strategy is already active');
    }

    strategy.parameters = parameters ?? strategy.parameters;
    strategy.isActive = true;
    strategy.activatedAt = new Date();

    const functionName = this.buildFunctionName(strategy.task);

    if (strategy.type === FiringStrategy.DAILY_AT_TIMES) {
      // Schedule one cron job per specified time
      this.scheduleAtTimes(strategy, functionName);
    } else if (strategy.type === FiringStrategy.DAILY_IN_RANGE) {
      // Use prediction service to find optimal time in each range, then schedule
      await this.scheduleInRanges(strategy, functionName);
    } else {
      // Standard repeatable strategy (DAILY, WEEKLY, MONTHLY, YEARLY, CUSTOM)
      const { cronExpression } = this.resolveScheduleParams(strategy);
      this.schedulerService.scheduleLambdaCall({
        jobId: strategy.id,
        functionName,
        cronExpression,
        payload: strategy.parameters,
      });
    }

    return this.strategyRepository.save(strategy);
  }

  /**
   * Deactivate a repeatable strategy — removes its cron job(s).
   */
  async deactivate(id: string): Promise<TaskStrategy> {
    const strategy = await this.findOne(id);

    if (!strategy.isActive) {
      throw new BadRequestException('Strategy is not active');
    }

    this.removeAllCronJobsForStrategy(strategy);
    strategy.isActive = false;
    return this.strategyRepository.save(strategy);
  }

  /**
   * Manually invoke a strategy once on the greenest server right now.
   * Does NOT change the activation state.
   */
  async invoke(
    id: string,
    parameters?: Record<string, any>,
  ): Promise<{ result: unknown }> {
    const strategy = await this.findOne(id);

    if (!strategy.isEnabled) {
      throw new BadRequestException('Strategy is disabled and cannot be invoked');
    }

    const functionName = this.buildFunctionName(strategy.task);
    const payload = { ...strategy.parameters, ...parameters };

    this.logger.log(`Manual invocation of ${functionName} on greenest server`);
    const result = await this.lambdaService.invokeGreenHandler(functionName, payload);

    strategy.lastFiredAt = new Date();
    await this.strategyRepository.save(strategy);
    await this.recordInvocation(strategy, result);

    return { result: result.payload };
  }

  // ---------------------------------------------------------------------------
  // Helpers used by TasksService (disable / delete)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Private: scheduling
  // ---------------------------------------------------------------------------

  /**
   * Schedule cron jobs for each time in strategy.times.
   * Each time gets its own cron job keyed by `strategyId:index`.
   */
  private scheduleAtTimes(strategy: TaskStrategy, functionName: string): void {
    if (!strategy.times?.length) {
      throw new BadRequestException('No times specified for DAILY_AT_TIMES strategy');
    }

    for (let i = 0; i < strategy.times.length; i++) {
      const [hour, minute] = strategy.times[i].split(':').map(Number);
      const cronExpression = `${minute} ${hour} * * *`;
      this.schedulerService.scheduleLambdaCall({
        jobId: `${strategy.id}:${i}`,
        functionName,
        cronExpression,
        payload: strategy.parameters,
      });
      this.logger.log(
        `Scheduled DAILY_AT_TIMES job ${strategy.id}:${i} at ${strategy.times[i]} UTC`,
      );
    }
  }

  /**
   * Use the prediction service to find the optimal execution time within each
   * time range, then schedule a daily cron job at that predicted time.
   */
  private async scheduleInRanges(
    strategy: TaskStrategy,
    functionName: string,
  ): Promise<void> {
    if (!strategy.timeRanges?.length) {
      throw new BadRequestException('No timeRanges specified for DAILY_IN_RANGE strategy');
    }

    for (let i = 0; i < strategy.timeRanges.length; i++) {
      const range = strategy.timeRanges[i];
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);

      // Build a date range for today so the prediction service can pick the best time
      const now = new Date();
      const startDate = new Date(now);
      startDate.setUTCHours(startH, startM, 0, 0);
      const endDate = new Date(now);
      endDate.setUTCHours(endH, endM, 0, 0);
      // Handle overnight ranges (e.g. 22:00 -> 04:00)
      if (endDate <= startDate) {
        endDate.setUTCDate(endDate.getUTCDate() + 1);
      }

      const prediction = await this.predictionService.predictOptimalExecutionDate({
        startDate,
        endDate,
      });

      const optHour = prediction.optimalDate.getUTCHours();
      const optMinute = prediction.optimalDate.getUTCMinutes();
      const cronExpression = `${optMinute} ${optHour} * * *`;

      this.schedulerService.scheduleLambdaCall({
        jobId: `${strategy.id}:range-${i}`,
        functionName,
        cronExpression,
        payload: strategy.parameters,
      });
      this.logger.log(
        `Scheduled DAILY_IN_RANGE job ${strategy.id}:range-${i} at ${optHour}:${String(optMinute).padStart(2, '0')} UTC ` +
          `(predicted greenest in ${range.start}-${range.end}, region: ${prediction.region})`,
      );
    }
  }

  /**
   * Remove all cron jobs associated with a strategy, including multi-slot ones.
   */
  private removeAllCronJobsForStrategy(strategy: TaskStrategy): void {
    // Remove the primary job (standard strategies)
    this.schedulerService.removeCronJob(strategy.id);

    // Remove indexed jobs (DAILY_AT_TIMES)
    if (strategy.times?.length) {
      for (let i = 0; i < strategy.times.length; i++) {
        this.schedulerService.removeCronJob(`${strategy.id}:${i}`);
      }
    }

    // Remove range jobs (DAILY_IN_RANGE)
    if (strategy.timeRanges?.length) {
      for (let i = 0; i < strategy.timeRanges.length; i++) {
        this.schedulerService.removeCronJob(`${strategy.id}:range-${i}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: helpers
  // ---------------------------------------------------------------------------

  private buildFunctionName(task: Task): string {
    const ownerId = (task as any).owner?.id ?? 'default';
    const projectId = (task as any).project?.id ?? 'default';
    const ownerShort = ownerId.substring(0, 8);
    const projShort = projectId.substring(0, 8);
    const workloadName = task.name.replace(/[^a-zA-Z0-9-]/g, '-');
    return `${ownerShort}-${projShort}-${workloadName}`;
  }

  /**
   * Creates an execution record with real AWS metrics + mock carbon data,
   * and propagates emissions to the organization totals.
   */
  private async recordInvocation(
    strategy: TaskStrategy,
    result: LambdaInvocationResult,
  ): Promise<TaskExecution> {
    const execution = this.executionRepository.create({
      task: strategy.task,
      status: ExecutionStatus.SUCCEEDED,
      provider: 'aws',
      region: result.region,
      scheduledAt: new Date(),
      metrics: result.metrics,
    });
    const saved = await this.executionRepository.save(execution);

    // Propagate emissions to organization
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

    // cronExpression overrides everything, no further validation needed
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
