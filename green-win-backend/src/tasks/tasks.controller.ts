import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

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
}
