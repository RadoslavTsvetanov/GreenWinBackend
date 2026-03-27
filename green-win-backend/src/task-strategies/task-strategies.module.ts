import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TaskStrategy } from './entities/task-strategy.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskStrategiesService } from './task-strategies.service';
import { TaskStrategiesController } from './task-strategies.controller';
import { AwsModule } from '../aws/aws.module';
import { LambdaModule } from '../lambda/lambda.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { PredictionModule } from '../prediction/prediction.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([TaskStrategy, Task]),
    AwsModule,
    LambdaModule,
    SchedulerModule,
    PredictionModule,
  ],
  controllers: [TaskStrategiesController],
  providers: [TaskStrategiesService],
  exports: [TaskStrategiesService],
})
export class TaskStrategiesModule {}
