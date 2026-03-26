import { Injectable } from '@nestjs/common';
import { CarbonService } from '../carbon/carbon.service';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PredictionResult {
  optimalDate: Date;
  region: string;
  estimatedCarbonIntensity: number;
}

@Injectable()
export class PredictionService {
  constructor(private readonly carbonService: CarbonService) {}

  async predictOptimalExecutionDate(
    dateRange: DateRange,
  ): Promise<PredictionResult> {
    // Get current carbon intensity rankings
    const regions = await this.carbonService.getSortedEuropeRegionsByCarbon();
    const bestRegion = regions[0];

    // Simple heuristic: pick middle of date range during off-peak hours (2-4 AM UTC)
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const midpoint = new Date(
      start.getTime() + (end.getTime() - start.getTime()) / 2,
    );

    // Adjust to 3 AM UTC (typically lowest energy demand)
    midpoint.setUTCHours(3, 0, 0, 0);

    // If adjusted time is outside range, use start date at 3 AM
    if (midpoint < start || midpoint > end) {
      const adjusted = new Date(start);
      adjusted.setUTCHours(3, 0, 0, 0);
      if (adjusted < start) {
        adjusted.setUTCDate(adjusted.getUTCDate() + 1);
      }

      return {
        optimalDate: adjusted > end ? start : adjusted,
        region: bestRegion.region,
        estimatedCarbonIntensity: bestRegion.carbonIntensity,
      };
    }

    return {
      optimalDate: midpoint,
      region: bestRegion.region,
      estimatedCarbonIntensity: bestRegion.carbonIntensity,
    };
  }
}
