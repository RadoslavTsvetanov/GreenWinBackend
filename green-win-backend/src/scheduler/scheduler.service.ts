import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { LambdaService } from '../lambda/lambda.service';

export interface ScheduledTask {
  taskId: string;
  functionName: string;
  cronExpression: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly lambdaService: LambdaService,
  ) {}

  scheduleLambdaCall(scheduledTask: ScheduledTask): void {
    const { taskId, functionName, cronExpression, payload } = scheduledTask;

    const job = new CronJob(cronExpression, async () => {
      this.logger.log(
        `Executing scheduled task ${taskId} for function ${functionName}`,
      );
      try {
        const result = await this.lambdaService.invokeGreenHandler(
          functionName,
          payload,
        );
        this.logger.log(
          `Task ${taskId} completed successfully: ${JSON.stringify(result)}`,
        );
      } catch (error) {
        this.logger.error(
          `Task ${taskId} failed: ${error.message}`,
          error.stack,
        );
      }
    });

    this.schedulerRegistry.addCronJob(taskId, job);
    job.start();

    this.logger.log(
      `Cron job ${taskId} added with expression: ${cronExpression}`,
    );
  }

  removeCronJob(taskId: string): void {
    try {
      this.schedulerRegistry.deleteCronJob(taskId);
      this.logger.log(`Cron job ${taskId} removed`);
    } catch (error) {
      this.logger.warn(`Failed to remove cron job ${taskId}: ${error.message}`);
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
    this.removeCronJob(scheduledTask.taskId);
    this.scheduleLambdaCall(scheduledTask);
  }
}
