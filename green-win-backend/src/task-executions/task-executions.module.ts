import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskExecution } from './entities/task-execution.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskExecutionsService } from './task-executions.service';
import { TaskExecutionsController } from './task-executions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskExecution, Task])],
  controllers: [TaskExecutionsController],
  providers: [TaskExecutionsService],
  exports: [TaskExecutionsService, TypeOrmModule],
})
export class TaskExecutionsModule {}
