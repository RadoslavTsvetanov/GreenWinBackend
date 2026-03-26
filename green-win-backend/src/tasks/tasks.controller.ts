import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AwsDeployService } from '../aws/aws-deploy.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { PredictionService } from '../prediction/prediction.service';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly awsDeployService: AwsDeployService,
    private readonly schedulerService: SchedulerService,
    private readonly predictionService: PredictionService,
  ) {}

  @Get()
  findAll(): Promise<Task[]> {
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Task | null> {
    return this.tasksService.findOne(id);
  }

  @Get('owner/:ownerId')
  findByOwner(@Param('ownerId') ownerId: string): Promise<Task[]> {
    return this.tasksService.findByOwner(ownerId);
  }

  @Post()
  create(@Body() taskData: Partial<Task>): Promise<Task> {
    return this.tasksService.create(taskData);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() taskData: Partial<Task>,
  ): Promise<Task | null> {
    return this.tasksService.update(id, taskData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.tasksService.remove(id);
  }

  @Post(':id/schedule')
  async scheduleTask(
    @Param('id') id: string,
    @Body() scheduleData: { cronExpression: string; payload?: Record<string, unknown> },
  ) {
    const task = await this.tasksService.findOne(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    const functionName = `${task.owner?.id || 'default'}-${task.name}`;

    const dateOfExecution = this.predictionService.predictOptimalExecutionDate({
      startDate: "",
      endDate: ""
    })

    this.schedulerService.scheduleLambdaCall({
      taskId: id,
      functionName,
      cronExpression: scheduleData.cronExpression,
      payload: scheduleData.payload,
    });

    

    return { message: 'Task scheduled successfully', taskId: id };
  }

  @Post(':id/invoke')
  async invokeTask(
    @Param('id') id: string,
    @Body() invokeData: { 
      startDate?: string; 
      endDate?: string; 
      payload?: Record<string, unknown>;
      immediate?: boolean;
    },
  ) {
    const task = await this.tasksService.findOne(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    const functionName = `${task.owner?.id || 'default'}-${task.name}`;

    // If immediate execution or no date range provided, invoke now
    if (invokeData.immediate || !invokeData.startDate || !invokeData.endDate) {
      // Invoke immediately (handled by gateway/lambda service)
      return { 
        message: 'Task invoked immediately', 
        taskId: id,
        functionName,
      };
    }

    // Use prediction service to find optimal execution time
    const prediction = await this.predictionService.predictOptimalExecutionDate({
      startDate: new Date(invokeData.startDate),
      endDate: new Date(invokeData.endDate),
    });

    // Schedule for the optimal time
    const optimalTime = prediction.optimalDate;
    const now = new Date();
    
    if (optimalTime <= now) {
      return {
        message: 'Optimal time is in the past, invoking immediately',
        taskId: id,
        prediction,
      };
    }

    // Convert to cron expression for one-time execution
    const cronExpression = `${optimalTime.getUTCMinutes()} ${optimalTime.getUTCHours()} ${optimalTime.getUTCDate()} ${optimalTime.getUTCMonth() + 1} *`;

    this.schedulerService.scheduleLambdaCall({
      taskId: `${id}-optimal`,
      functionName,
      cronExpression,
      payload: invokeData.payload,
    });

    return {
      message: 'Task scheduled for optimal execution time',
      taskId: id,
      prediction,
      scheduledFor: optimalTime,
    };
  }

  @Delete(':id/schedule')
  async unscheduleTask(@Param('id') id: string) {
    this.schedulerService.removeCronJob(id);
    return { message: 'Task unscheduled successfully', taskId: id };
  }

  @Get('scheduled')
  getScheduledTasks() {
    const jobs = this.schedulerService.getAllCronJobs();
    return {
      count: jobs.size,
      tasks: Array.from(jobs.keys()),
    };
  }
}
