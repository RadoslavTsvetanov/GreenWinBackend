import { Module } from '@nestjs/common';
import { AwsDeployService } from './aws-deploy.service';

@Module({
  providers: [AwsDeployService],
  exports: [AwsDeployService],
})
export class AwsModule {}
