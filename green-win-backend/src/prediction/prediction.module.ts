import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PredictionService } from './prediction.service';
import { PredictionController } from './prediction.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PredictionController],
  providers: [PredictionService],
  exports: [PredictionService],
})
export class PredictionModule {}
