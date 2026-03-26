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
import { CreateTaskStrategyDto } from './dto/create-task-strategy.dto';
import {
  FiringStrategy,
  REPEATABLE_STRATEGIES,
  STRATEGY_CRON,
} from './enums/firing-strategy.enum';
import { TaskStatus, TaskCodeType } from '../tasks/enums/task.enums';
import { AwsDeployService } from '../aws/aws-deploy.service';
import { LambdaService } from '../lambda/lambda.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { EUROPE_AWS_REGION_COUNTRY } from '../carbon/constants/aws-regions';

@Injectable()
export class TaskStrategiesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskStrategiesService.name);

  constructor(
    @InjectRepository(TaskStrategy)
    private readonly strategyRepository: Repository<TaskStrategy>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly awsDeployService: AwsDeployService,
    private readonly lambdaService: LambdaService,
    private readonly schedulerService: SchedulerService,
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
      relations: ['task', 'task.project', 'task.project.organization'],
    });

    if (!active.length) {
      this.logger.log('[RECOVERY] No active strategies to restore');
      return;
    }

    let restored = 0;
    for (const strategy of active) {
      if (!strategy.task.isEnabled) {
        this.logger.warn(
          `[RECOVERY] Strategy ${strategy.id} belongs to disabled task — skipping`,
        );
        continue;
      }
      try {
        const { functionName, cronExpression } = this.resolveScheduleParams(strategy);
        // Each strategy gets its own cron job keyed by strategy.id
        this.schedulerService.scheduleLambdaCall({
          jobId: strategy.id,
          functionName,
          cronExpression,
        });
        this.logger.log(
          `[RECOVERY] Restored cron for strategy ${strategy.id} (${strategy.type})`,
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
      relations: ['task', 'task.project', 'task.project.organization'],
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
    const strategy = this.strategyRepository.create({
      task,
      type: dto.type,
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

  // ---------------------------------------------------------------------------
  // Activation / deactivation
  // ---------------------------------------------------------------------------

  async activate(id: string, parameters?: Record<string, any>): Promise<TaskStrategy> {
    const strategy = await this.findOne(id);
    const task = strategy.task;

    if (!task.isEnabled) {
      throw new BadRequestException(
        `Task ${task.id} is disabled — enable it before activating a strategy`,
      );
    }
    if (strategy.isActive) {
      throw new BadRequestException('Strategy is already active');
    }

    // Validate supplied parameters against the task's declared schema
    const resolvedParams = this.resolveParameters(task, parameters);

    // Deploy lambda code to all EU regions (idempotent — safe to call even if
    // another strategy already deployed it)
    await this.deployLambda(task);

    if (resolvedParams !== null) {
      strategy.parameters = resolvedParams;
    }

    const isRepeatable = REPEATABLE_STRATEGIES.has(strategy.type);

    if (!isRepeatable) {
      // IMMEDIATELY — fire once, no cron, stays inactive
      await this.tasksRepository.update(task.id, { status: TaskStatus.RUNNING });
      try {
        await this.lambdaService.invokeGreenHandler(
          this.buildFunctionName(task),
          resolvedParams ?? undefined,
        );
        await this.tasksRepository.update(task.id, { status: TaskStatus.SUCCEEDED });
      } catch (err: any) {
        await this.tasksRepository.update(task.id, { status: TaskStatus.FAILED });
        throw err;
      }
      strategy.lastFiredAt = new Date();
      return this.strategyRepository.save(strategy);
    }

    // Repeatable — each strategy gets its own cron slot keyed by strategy.id
    // so multiple strategies on the same task can coexist
    const { functionName, cronExpression } = this.resolveScheduleParams(strategy);
    this.schedulerService.scheduleLambdaCall({
      jobId: strategy.id,
      functionName,
      cronExpression,
      payload: resolvedParams ?? undefined,
    });

    strategy.isActive = true;
    strategy.activatedAt = new Date();
    await this.strategyRepository.save(strategy);

    // Mark the task as QUEUED if it isn't already running/queued from another strategy
    const current = await this.tasksRepository.findOne({ where: { id: task.id } });
    if (current && current.status === TaskStatus.DRAFT) {
      await this.tasksRepository.update(task.id, { status: TaskStatus.QUEUED });
    }

    this.logger.log(`Strategy ${id} (${strategy.type}) activated for task ${task.id}`);
    return strategy;
  }

  async deactivate(id: string): Promise<TaskStrategy> {
    const strategy = await this.findOne(id);

    if (!strategy.isActive) {
      throw new BadRequestException('Strategy is not active');
    }
    if (!REPEATABLE_STRATEGIES.has(strategy.type)) {
      throw new BadRequestException(
        'IMMEDIATELY strategies cannot be deactivated — they fire once and complete',
      );
    }

    // Remove only this strategy's cron job — other strategies on the same task
    // keep running untouched
    this.schedulerService.removeCronJob(strategy.id);

    strategy.isActive = false;
    await this.strategyRepository.save(strategy);

    // If no other strategy on this task is still active, revert status to DRAFT
    const stillActive = await this.strategyRepository.findOne({
      where: { task: { id: strategy.task.id }, isActive: true },
    });
    if (!stillActive) {
      await this.tasksRepository.update(strategy.task.id, { status: TaskStatus.DRAFT });
    }

    this.logger.log(`Strategy ${id} deactivated for task ${strategy.task.id}`);
    return strategy;
  }

  // ---------------------------------------------------------------------------
  // Helpers used by TasksService (disable / delete)
  // ---------------------------------------------------------------------------

  async deactivateAllForTask(taskId: string): Promise<void> {
    const active = await this.strategyRepository.find({
      where: { task: { id: taskId }, isActive: true },
    });
    for (const s of active) {
      this.schedulerService.removeCronJob(s.id);
      s.isActive = false;
    }
    if (active.length) await this.strategyRepository.save(active);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Merges supplied parameters with schema defaults and validates required fields.
   * Returns null when the task has no schema defined.
   */
  private resolveParameters(
    task: Task,
    supplied?: Record<string, any>,
  ): Record<string, any> | null {
    if (!task.parameterSchema?.length) return supplied ?? null;

    const merged: Record<string, any> = {};

    for (const item of task.parameterSchema) {
      const value = supplied?.[item.name] ?? item.default;
      if (item.required && value === undefined) {
        throw new BadRequestException(
          `Missing required parameter "${item.name}" (type: ${item.type})`,
        );
      }
      if (value !== undefined) {
        merged[item.name] = value;
      }
    }

    return merged;
  }

  private buildFunctionName(task: Task): string {
    const orgName = (task.project as any)?.organization?.name ?? 'default';
    return `${orgName}-${task.name}`;
  }

  private async deployLambda(task: Task): Promise<void> {
    if (task.codeType !== TaskCodeType.LAMBDA || !task.lambdaCode) return;

    const orgName = (task.project as any)?.organization?.name ?? 'default';
    const roleArn = this.configService.get<string>('AWS_LAMBDA_ROLE_ARN', '');
    const euRegions = Object.keys(EUROPE_AWS_REGION_COUNTRY);

    this.logger.log(`Deploying lambda for task ${task.id} to ${euRegions.length} EU regions`);
    await this.awsDeployService.deployToMultipleRegions({
      workloadName: task.name,
      organization: orgName,
      regions: euRegions,
      roleArn,
      handlerCode: { 'index.js': task.lambdaCode },
    });
  }

  private resolveScheduleParams(strategy: TaskStrategy): {
    functionName: string;
    cronExpression: string;
  } {
    const functionName = this.buildFunctionName(strategy.task);

    if (strategy.type === FiringStrategy.CUSTOM) {
      if (!strategy.cronExpression) {
        throw new BadRequestException(
          `CUSTOM strategy ${strategy.id} has no cronExpression`,
        );
      }
      return { functionName, cronExpression: strategy.cronExpression };
    }

    const cronExpression = STRATEGY_CRON[strategy.type];
    if (!cronExpression) {
      throw new BadRequestException(
        `No cron mapping for strategy type ${strategy.type}`,
      );
    }
    return { functionName, cronExpression };
  }
}
