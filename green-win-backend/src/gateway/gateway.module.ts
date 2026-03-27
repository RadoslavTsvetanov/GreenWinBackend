import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { LambdaModule } from '../lambda/lambda.module';
import { TaskStrategiesModule } from '../task-strategies/task-strategies.module';

@Module({
  imports: [LambdaModule, TaskStrategiesModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
