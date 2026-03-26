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
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOkResponse({ type: [Task], description: 'List all tasks' })
  @Get()
  findAll(): Promise<Task[]> {
    return this.tasksService.findAll();
  }

  @ApiOkResponse({ type: Task, description: 'Fetch a task by ID' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Task | null> {
    return this.tasksService.findOne(id);
  }

  @ApiOkResponse({ type: [Task], description: 'List tasks for a specific owner' })
  @Get('owner/:ownerId')
  findByOwner(@Param('ownerId') ownerId: string): Promise<Task[]> {
    return this.tasksService.findByOwner(ownerId);
  }

  @ApiCreatedResponse({ type: Task, description: 'Create a new task' })
  @ApiBody({ type: CreateTaskDto })
  @Post()
  create(@Body() taskData: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(taskData);
  }

  @ApiOkResponse({ type: Task, description: 'Update an existing task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiBody({ type: UpdateTaskDto })
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() taskData: UpdateTaskDto,
  ): Promise<Task | null> {
    return this.tasksService.update(id, taskData);
  }

  @ApiResponse({ status: 204, description: 'Task deleted' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.tasksService.remove(id);
  }
}
