import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TaskExecutionsService } from './task-executions.service';
import { TaskExecution } from './entities/task-execution.entity';
import { CreateTaskExecutionDto } from './dto/create-task-execution.dto';
import { UpdateTaskExecutionDto } from './dto/update-task-execution.dto';

@ApiTags('task-executions')
@Controller('task-executions')
export class TaskExecutionsController {
  constructor(
    private readonly executionsService: TaskExecutionsService,
  ) {}

  @ApiOkResponse({
    type: [TaskExecution],
    description: 'List all task executions',
  })
  @Get()
  findAll(): Promise<TaskExecution[]> {
    return this.executionsService.findAll();
  }

  @ApiOkResponse({ type: TaskExecution, description: 'Fetch execution by ID' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<TaskExecution | null> {
    return this.executionsService.findOne(id);
  }

  @ApiOkResponse({
    type: [TaskExecution],
    description: 'List executions for a task',
  })
  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string): Promise<TaskExecution[]> {
    return this.executionsService.findByTask(taskId);
  }

  @ApiCreatedResponse({
    type: TaskExecution,
    description: 'Create a new task execution',
  })
  @ApiBody({ type: CreateTaskExecutionDto })
  @Post()
  create(
    @Body() executionData: CreateTaskExecutionDto,
  ): Promise<TaskExecution> {
    return this.executionsService.create(executionData);
  }

  @ApiOkResponse({
    type: TaskExecution,
    description: 'Update an existing task execution',
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiBody({ type: UpdateTaskExecutionDto })
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() executionData: UpdateTaskExecutionDto,
  ): Promise<TaskExecution | null> {
    return this.executionsService.update(id, executionData);
  }

  @ApiResponse({ status: 204, description: 'Execution deleted' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.executionsService.remove(id);
  }
}
