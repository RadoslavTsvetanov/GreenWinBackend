import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Checkpoint } from './entities/checkpoint.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskExecution } from '../task-executions/entities/task-execution.entity';
import { CheckpointsService } from './checkpoints.service';
import { CheckpointsController } from './checkpoints.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Checkpoint, Task, TaskExecution])],
  controllers: [CheckpointsController],
  providers: [CheckpointsService],
  exports: [CheckpointsService, TypeOrmModule],
})
export class CheckpointsModule {}
