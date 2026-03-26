import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PredictionService, DateRange } from './prediction.service';

@ApiTags('prediction')
@Controller('prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Post('optimal-date')
  async predictOptimalDate(@Body() dateRange: DateRange) {
    return this.predictionService.predictOptimalExecutionDate(dateRange);
  }
}
