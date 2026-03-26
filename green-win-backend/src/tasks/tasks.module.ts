import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AwsModule } from '../aws/aws.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { PredictionModule } from '../prediction/prediction.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), AwsModule, SchedulerModule, PredictionModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService, TypeOrmModule],
})
export class TasksModule {}
