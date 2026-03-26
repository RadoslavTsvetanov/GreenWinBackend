import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CheckpointsService } from './checkpoints.service';
import { Checkpoint } from './entities/checkpoint.entity';

@Controller('checkpoints')
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Get()
  findAll(): Promise<Checkpoint[]> {
    return this.checkpointsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Checkpoint | null> {
    return this.checkpointsService.findOne(id);
  }

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string): Promise<Checkpoint[]> {
    return this.checkpointsService.findByTask(taskId);
  }

  @Get('execution/:executionId')
  findByExecution(
    @Param('executionId') executionId: string,
  ): Promise<Checkpoint[]> {
    return this.checkpointsService.findByExecution(executionId);
  }

  @Post()
  create(@Body() checkpointData: Partial<Checkpoint>): Promise<Checkpoint> {
    return this.checkpointsService.create(checkpointData);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() checkpointData: Partial<Checkpoint>,
  ): Promise<Checkpoint | null> {
    return this.checkpointsService.update(id, checkpointData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.checkpointsService.remove(id);
  }
}
