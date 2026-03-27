import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { LambdaService, LambdaInvocationResult } from '../lambda/lambda.service';

export interface ScheduledTask {
  /** Unique key for this cron slot. */
  jobId: string;
  functionName: string;
  cronExpression: string;
  payload?: Record<string, unknown>;
  /** Called after each successful invocation with the full result (metrics, region, etc.). */
  onSuccess?: (result: LambdaInvocationResult) => Promise<void>;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly lambdaService: LambdaService,
  ) {}

  // -------------------------------------------------------------------------
  // Recurring cron — fires on every tick of the cron expression
  // -------------------------------------------------------------------------

  scheduleLambdaCall(scheduledTask: ScheduledTask): void {
    const { jobId, functionName, cronExpression, payload, onSuccess } = scheduledTask;

    const job = new CronJob(cronExpression, async () => {
      this.logger.log(`Executing cron job ${jobId} → ${functionName}`);
      try {
        const result = await this.lambdaService.invokeGreenHandler(functionName, payload);
        this.logger.log(`Cron job ${jobId} tick succeeded`);
        if (onSuccess) {
          await onSuccess(result);
        }
      } catch (error) {
        this.logger.error(`Cron job ${jobId} tick failed: ${error.message}`, error.stack);
      }
    });

    this.schedulerRegistry.addCronJob(jobId, job);
    job.start();
    this.logger.log(`Recurring cron ${jobId} registered with expression: ${cronExpression}`);
  }

  // -------------------------------------------------------------------------
  // One-shot cron — fires exactly once at `runAt`, then self-destructs
  // -------------------------------------------------------------------------

  scheduleOnce(
    taskId: string,
    runAt: Date,
    callback: () => Promise<void>,
  ): void {
    const key = `once:${taskId}`;

    const job = new CronJob(runAt, async () => {
      this.logger.log(`Executing one-shot cron ${key}`);
      try {
        await callback();
        this.logger.log(`One-shot cron ${key} completed`);
      } catch (error) {
        this.logger.error(`One-shot cron ${key} failed: ${error.message}`, error.stack);
      } finally {
        job.stop();
        try {
          this.schedulerRegistry.deleteCronJob(key);
        } catch { /* already removed */ }
      }
    });

    this.schedulerRegistry.addCronJob(key, job);
    job.start();
    this.logger.log(`One-shot cron ${key} scheduled for ${runAt.toISOString()}`);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  removeCronJob(taskId: string): void {
    try {
      this.schedulerRegistry.deleteCronJob(taskId);
      this.logger.log(`Cron job ${taskId} removed`);
    } catch (error) {
      this.logger.warn(`Failed to remove cron job ${taskId}: ${error.message}`);
    }
  }

  removeOneShotCron(taskId: string): void {
    try {
      this.schedulerRegistry.deleteCronJob(`once:${taskId}`);
      this.logger.log(`One-shot cron once:${taskId} removed`);
    } catch (error) {
      this.logger.warn(`Failed to remove one-shot cron once:${taskId}: ${error.message}`);
    }
  }

  getCronJob(taskId: string): CronJob | undefined {
    try {
      return this.schedulerRegistry.getCronJob(taskId);
    } catch {
      return undefined;
    }
  }

  getAllCronJobs(): Map<string, CronJob> {
    return this.schedulerRegistry.getCronJobs();
  }

  updateCronJob(scheduledTask: ScheduledTask): void {
    this.removeCronJob(scheduledTask.jobId);
    this.scheduleLambdaCall(scheduledTask);
  }
}
