import { Module } from '@nestjs/common';
import { LambdaService } from './lambda.service';
import { CarbonModule } from '../carbon/carbon.module';

@Module({
  imports: [CarbonModule],
  providers: [LambdaService],
  exports: [LambdaService],
})
export class LambdaModule {}
