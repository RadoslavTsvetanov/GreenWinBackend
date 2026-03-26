import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskRunMode, TaskStatus, TaskCodeType } from './enums/task.enums';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AwsDeployService } from '../aws/aws-deploy.service';
import { LambdaService } from '../lambda/lambda.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { PredictionService } from '../prediction/prediction.service';
import { EUROPE_AWS_REGION_COUNTRY } from '../carbon/constants/aws-regions';

@Injectable()
export class TasksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly awsDeployService: AwsDeployService,
    private readonly lambdaService: LambdaService,
    private readonly schedulerService: SchedulerService,
    private readonly predictionService: PredictionService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Startup recovery
  // ---------------------------------------------------------------------------

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.recoverScheduledTasks();
    } catch (err: any) {
      this.logger.error(`Startup recovery failed: ${err.message}`, err.stack);
    }
  }

  private async recoverScheduledTasks(): Promise<void> {
    // Any task left in RUNNING when the server restarted cannot be trusted —
    // mark it FAILED so it can be manually retried.
    const { affected: crashed } = await this.tasksRepository.update(
      { status: TaskStatus.RUNNING },
      { status: TaskStatus.FAILED },
    );
    if (crashed) {
      this.logger.warn(`[RECOVERY] Reset ${crashed} crashed RUNNING task(s) to FAILED`);
    }

    // Load every QUEUED scheduled lambda task with its project/org so we have
    // everything we need to re-register cron jobs or reschedule.
    const queued = await this.tasksRepository.find({
      where: { status: TaskStatus.QUEUED, runMode: TaskRunMode.SCHEDULED, codeType: TaskCodeType.LAMBDA },
      relations: ['project', 'project.organization'],
    });

    if (!queued.length) {
      this.logger.log('[RECOVERY] No queued tasks to restore');
      return;
    }

    const now = new Date();
    let recovered = 0;
    let missed = 0;

    for (const task of queued) {
      if (!task.lambdaCode) continue;

      try {
        if (task.cronExpression) {
          // Recurring task: the lambda is already deployed in AWS from before the
          // restart — just re-register the cron so it keeps firing on schedule.
          const { functionName } = this.buildDeployParams(task);
          this.schedulerService.scheduleLambdaCall({
            taskId: task.id,
            functionName,
            cronExpression: task.cronExpression,
          });
          this.logger.log(`[RECOVERY] Re-registered recurring cron for task ${task.id}`);
          recovered++;
        } else {
          // One-shot task: check whether the execution window has completely passed.
          const windowEnd = task.latestFinishAt ? new Date(task.latestFinishAt) : null;
          if (windowEnd && windowEnd < now) {
            await this.setStatus(task.id, TaskStatus.FAILED);
            this.logger.warn(
              `[RECOVERY] Task ${task.id} missed its execution window (ended ${windowEnd.toISOString()}) — marked FAILED`,
            );
            missed++;
            continue;
          }

          // Window is still open (or unbounded). scheduleOneShot will re-run the
          // prediction; if the predicted time is already in the past the CronJob
          // fires immediately, which is the correct catch-up behaviour.
          await this.scheduleOneShot(task);
          this.logger.log(`[RECOVERY] Rescheduled one-shot task ${task.id}`);
          recovered++;
        }
      } catch (err: any) {
        this.logger.error(`[RECOVERY] Failed to recover task ${task.id}: ${err.message}`, err.stack);
      }
    }

    this.logger.log(`[RECOVERY] Done — recovered ${recovered}, missed ${missed}`);
  }

  // ---------------------------------------------------------------------------
  // Public CRUD
  // ---------------------------------------------------------------------------

  async findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: ['owner', 'project', 'project.organization', 'executions', 'checkpoints'],
    });
  }

  async findOne(id: string): Promise<Task | null> {
    return this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'project', 'project.organization', 'executions', 'checkpoints'],
    });
  }

  async findByOwner(ownerId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { owner: { id: ownerId } },
      relations: ['owner', 'project', 'project.organization', 'executions', 'checkpoints'],
    });
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const owner = await this.usersRepository.findOne({ where: { id: dto.ownerId } });
    if (!owner) {
      throw new NotFoundException(`User with ID ${dto.ownerId} not found`);
    }

    let project: Project | null = null;
    if (dto.projectId) {
      project = await this.projectsRepository.findOne({
        where: { id: dto.projectId },
        relations: ['organization'],
      });
      if (!project) {
        throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
      }
    }

    const { ownerId, projectId, earliestStartAt, latestFinishAt, ...rest } = dto;

    const task = this.tasksRepository.create({
      ...rest,
      owner,
      project: project ?? undefined,
      earliestStartAt: earliestStartAt ? new Date(earliestStartAt) : undefined,
      latestFinishAt: latestFinishAt ? new Date(latestFinishAt) : undefined,
    });

    const saved = await this.tasksRepository.save(task);
    // Attach loaded relations so dispatchTask can read them without extra queries
    saved.project = project as Project;
    saved.owner = owner;

    void this.dispatchTask(saved).catch((err: Error) =>
      this.logger.error(`Dispatch failed for task ${saved.id}: ${err.message}`, err.stack),
    );

    return saved;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task | null> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (dto.ownerId) {
      const owner = await this.usersRepository.findOne({ where: { id: dto.ownerId } });
      if (!owner) {
        throw new NotFoundException(`User with ID ${dto.ownerId} not found`);
      }
      task.owner = owner;
    }

    if (dto.projectId !== undefined) {
      if (dto.projectId) {
        const project = await this.projectsRepository.findOne({ where: { id: dto.projectId } });
        if (!project) {
          throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
        }
        task.project = project;
      } else {
        task.project = null as any;
      }
    }

    const { ownerId, projectId, earliestStartAt, latestFinishAt, ...rest } = dto;

    Object.assign(task, {
      ...rest,
      earliestStartAt: earliestStartAt ? new Date(earliestStartAt) : task.earliestStartAt,
      latestFinishAt: latestFinishAt ? new Date(latestFinishAt) : task.latestFinishAt,
    });

    return this.tasksRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    await this.tasksRepository.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Dispatch logic
  // ---------------------------------------------------------------------------

  private async dispatchTask(task: Task): Promise<void> {
    if (task.codeType !== TaskCodeType.LAMBDA || !task.lambdaCode) {
      this.logger.log(`Task ${task.id} skipped dispatch: no lambda code or non-lambda type`);
      return;
    }

    if (task.runMode === TaskRunMode.IMMEDIATE) {
      // Deploy to all EU regions then invoke in the greenest one right now.
      await this.deployAndExecuteNow(task);
      return;
    }

    if (task.runMode === TaskRunMode.SCHEDULED) {
      if (task.cronExpression) {
        // Recurring: deploy once upfront so the function is always present,
        // then register a repeating cron that just invokes on each tick.
        await this.deployForRecurring(task);
      } else {
        // One-shot: use the prediction service to pick the greenest moment in
        // the [earliestStartAt, latestFinishAt] window, then register a
        // single-fire cron job for that time.
        await this.scheduleOneShot(task);
      }
    }
  }

  // Deploy to every EU region then invoke immediately.
  private async deployAndExecuteNow(task: Task): Promise<void> {
    await this.setStatus(task.id, TaskStatus.RUNNING);

    try {
      const { functionName, euRegions, roleArn } = this.buildDeployParams(task);

      this.logger.log(`[IMMEDIATE] Deploying task ${task.id} to ${euRegions.length} EU regions`);
      await this.awsDeployService.deployToMultipleRegions({
        workloadName: task.name,
        organization: this.getOrgName(task),
        regions: euRegions,
        roleArn,
        handlerCode: { 'index.js': task.lambdaCode! },
      });

      this.logger.log(`[IMMEDIATE] Invoking ${functionName} in greenest region`);
      await this.lambdaService.invokeGreenHandler(functionName);

      await this.setStatus(task.id, TaskStatus.SUCCEEDED);
      this.logger.log(`[IMMEDIATE] Task ${task.id} succeeded`);
    } catch (err: any) {
      await this.setStatus(task.id, TaskStatus.FAILED);
      this.logger.error(`[IMMEDIATE] Task ${task.id} failed: ${err.message}`, err.stack);
      throw err;
    }
  }

  // Deploy once to all EU regions upfront, then register a recurring cron that
  // just invokes the already-deployed function on every tick.
  private async deployForRecurring(task: Task): Promise<void> {
    const { functionName, euRegions, roleArn } = this.buildDeployParams(task);

    this.logger.log(`[RECURRING] Deploying task ${task.id} to ${euRegions.length} EU regions`);
    try {
      await this.awsDeployService.deployToMultipleRegions({
        workloadName: task.name,
        organization: this.getOrgName(task),
        regions: euRegions,
        roleArn,
        handlerCode: { 'index.js': task.lambdaCode! },
      });
    } catch (err: any) {
      await this.setStatus(task.id, TaskStatus.FAILED);
      this.logger.error(`[RECURRING] Deploy failed for task ${task.id}: ${err.message}`, err.stack);
      throw err;
    }

    await this.setStatus(task.id, TaskStatus.QUEUED);

    this.schedulerService.scheduleLambdaCall({
      taskId: task.id,
      functionName,
      cronExpression: task.cronExpression,
    });

    this.logger.log(
      `[RECURRING] Task ${task.id} registered with cron: ${task.cronExpression}`,
    );
  }

  // Use the prediction service to find the greenest execution moment within the
  // allowed window, then register a single-fire CronJob for that exact time.
  private async scheduleOneShot(task: Task): Promise<void> {
    if (!task.earliestStartAt) {
      this.logger.warn(`[ONE-SHOT] Task ${task.id} has no earliestStartAt — skipping`);
      return;
    }

    const startDate = new Date(task.earliestStartAt);
    const endDate = task.latestFinishAt
      ? new Date(task.latestFinishAt)
      : new Date(startDate.getTime() + 3_600_000); // default 1-hour window

    let runAt: Date;
    try {
      const prediction = await this.predictionService.predictOptimalExecutionDate({
        startDate,
        endDate,
      });
      runAt = prediction.optimalDate;
      this.logger.log(
        `[ONE-SHOT] Task ${task.id}: optimal time ${runAt.toISOString()} (region ${prediction.region})`,
      );
    } catch {
      runAt = startDate;
      this.logger.warn(`[ONE-SHOT] Task ${task.id}: prediction failed, falling back to earliestStartAt`);
    }

    await this.setStatus(task.id, TaskStatus.QUEUED);

    const taskId = task.id;
    this.schedulerService.scheduleOnce(taskId, runAt, async () => {
      // Re-fetch the task with relations at execution time so we have fresh data.
      const fresh = await this.tasksRepository.findOne({
        where: { id: taskId },
        relations: ['project', 'project.organization'],
      });
      if (!fresh) {
        this.logger.warn(`[ONE-SHOT] Task ${taskId} not found at execution time — skipping`);
        return;
      }
      await this.deployAndExecuteNow(fresh);
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getOrgName(task: Task): string {
    return (task.project as any)?.organization?.name ?? 'default';
  }

  private buildDeployParams(task: Task) {
    const orgName = this.getOrgName(task);
    const functionName = `${orgName}-${task.name}`;
    const euRegions = Object.keys(EUROPE_AWS_REGION_COUNTRY);
    const roleArn = this.configService.get<string>('AWS_LAMBDA_ROLE_ARN', '');
    return { functionName, euRegions, roleArn };
  }

  private async setStatus(taskId: string, status: TaskStatus): Promise<void> {
    await this.tasksRepository.update(taskId, { status });
  }
}
