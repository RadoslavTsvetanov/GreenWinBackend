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
import { TaskExecutionsService } from './task-executions.service';
import { CreateTaskExecutionDto } from './dto/create-task-execution.dto';
import { UpdateTaskExecutionDto } from './dto/update-task-execution.dto';
import { TaskExecution } from './entities/task-execution.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('task-executions')
@ApiBearerAuth('access-token')
@Controller('task-executions')
@UseGuards(JwtAuthGuard)
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
  create(@Body() dto: CreateTaskExecutionDto): Promise<TaskExecution> {
    return this.executionsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskExecutionDto,
  ): Promise<TaskExecution | null> {
    return this.executionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.executionsService.remove(id);
  }
}
