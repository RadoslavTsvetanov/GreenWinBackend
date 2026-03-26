import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TaskExecutionsService } from './task-executions.service';
import { TaskExecution } from './entities/task-execution.entity';

@Controller('task-executions')
export class TaskExecutionsController {
  constructor(
    private readonly executionsService: TaskExecutionsService,
  ) {}

  @Get()
  findAll(): Promise<TaskExecution[]> {
    return this.executionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<TaskExecution | null> {
    return this.executionsService.findOne(id);
  }

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string): Promise<TaskExecution[]> {
    return this.executionsService.findByTask(taskId);
  }

  @Post()
  create(@Body() executionData: Partial<TaskExecution>): Promise<TaskExecution> {
    return this.executionsService.create(executionData);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() executionData: Partial<TaskExecution>,
  ): Promise<TaskExecution | null> {
    return this.executionsService.update(id, executionData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.executionsService.remove(id);
  }
}
