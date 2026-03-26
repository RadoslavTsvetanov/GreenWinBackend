import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List all tasks' })
  findAll() {
    return this.tasksService.findAll();
  }

  @Get('owner/:ownerId')
  @ApiOperation({ summary: 'Get tasks by owner ID' })
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.tasksService.findByOwner(ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID (includes strategies, executions, checkpoints)' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get the current status and enabled state of a task' })
  getStatus(@Param('id') id: string) {
    return this.tasksService.getStatus(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a task',
    description:
      'Creates the task and optionally pre-attaches firing strategies. ' +
      'No execution happens at this point — activate a strategy separately.',
  })
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (stops any active strategy first)' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Re-enable a disabled task' })
  enable(@Param('id') id: string) {
    return this.tasksService.enable(id);
  }

  @Patch(':id/disable')
  @ApiOperation({
    summary: 'Disable a task',
    description: 'Stops any active strategy cron job and prevents further activations.',
  })
  disable(@Param('id') id: string) {
    return this.tasksService.disable(id);
  }
}
