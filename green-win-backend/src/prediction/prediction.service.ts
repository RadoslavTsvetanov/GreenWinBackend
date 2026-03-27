import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EUROPE_AWS_REGION_COUNTRY } from '../carbon/constants/aws-regions';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PredictionResult {
  optimalDate: Date;
  region: string;
  estimatedCarbonIntensity: number;
}

/** Reverse map: country code → AWS region */
const COUNTRY_TO_AWS_REGION: Record<string, string> = {};
for (const [region, country] of Object.entries(EUROPE_AWS_REGION_COUNTRY)) {
  COUNTRY_TO_AWS_REGION[country] = region;
}

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);
  private readonly modelUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.modelUrl = this.configService.get<string>('MODEL_URL') ?? 'http://localhost:5000';
  }

  async predictOptimalExecutionDate(
    dateRange: DateRange,
  ): Promise<PredictionResult> {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);

    try {
      const response = await fetch(`${this.modelUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: start.toISOString(),
          end_date: end.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Model responded with ${response.status}: ${error}`);
      }

      const data = await response.json();

      // Map the model's country zone (e.g. "SE") to an AWS region (e.g. "eu-north-1")
      const awsRegion = COUNTRY_TO_AWS_REGION[data.best_region] ?? 'eu-north-1';

      this.logger.log(
        `ML model prediction: best_time=${data.best_time}, ` +
          `best_region=${data.best_region} (${awsRegion}), ` +
          `carbon_intensity=${data.min_carbon_intensity}`,
      );

      return {
        optimalDate: new Date(data.best_time),
        region: awsRegion,
        estimatedCarbonIntensity: data.min_carbon_intensity,
      };
    } catch (err: any) {
      this.logger.warn(
        `ML model call failed (${err.message}), falling back to midpoint heuristic`,
      );
      return this.fallbackPrediction(start, end);
    }
  }

  /** Simple fallback if the model service is unavailable. */
  private fallbackPrediction(start: Date, end: Date): PredictionResult {
    const midpoint = new Date(
      start.getTime() + (end.getTime() - start.getTime()) / 2,
    );
    return {
      optimalDate: midpoint,
      region: 'eu-north-1', // Sweden — lowest mock carbon intensity
      estimatedCarbonIntensity: 13,
    };
  }
}
