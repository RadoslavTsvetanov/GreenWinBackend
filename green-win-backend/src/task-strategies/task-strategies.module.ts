import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TaskStrategy } from './entities/task-strategy.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskExecution } from '../task-executions/entities/task-execution.entity';
import { TaskStrategiesService } from './task-strategies.service';
import { TaskStrategiesController } from './task-strategies.controller';
import { LambdaModule } from '../lambda/lambda.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { PredictionModule } from '../prediction/prediction.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([TaskStrategy, Task, TaskExecution]),
    LambdaModule,
    SchedulerModule,
    PredictionModule,
    OrganizationsModule,
  ],
  controllers: [TaskStrategiesController],
  providers: [TaskStrategiesService],
  exports: [TaskStrategiesService],
})
export class TaskStrategiesModule {}
