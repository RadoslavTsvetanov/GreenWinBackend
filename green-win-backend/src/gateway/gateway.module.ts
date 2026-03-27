import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { LambdaModule } from '../lambda/lambda.module';
import { TaskExecutionsModule } from '../task-executions/task-executions.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [LambdaModule, TaskExecutionsModule, TasksModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
