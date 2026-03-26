import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { LambdaModule } from '../lambda/lambda.module';

@Module({
  imports: [LambdaModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
