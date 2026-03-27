import { Injectable } from '@nestjs/common';
import { EUROPE_AWS_REGION_COUNTRY } from './constants/aws-regions';

const MOCK_CARBON_INTENSITY: Record<string, number> = {
  DE: 350,
  CH: 18,
  SE: 13,
  IT: 233,
  ES: 165,
  IE: 290,
  GB: 210,
  FR: 56,
  US: 40,
};

export interface EuropeRegionCarbonEntry {
  region: string;
  carbonIntensity: number;
}

export interface LambdaExecutionMetrics {
  memoryUsedMB: number;
  billedDurationMs: number;
}

export interface CarbonFootprintResult {
  energyKWh: number;
  carbonFootprintGCO2: number;
  carbonIntensity: number;
}

@Injectable()
export class CarbonService {
  private readonly LAMBDA_POWER_PER_GB_MS = 0.0000166667;

  async getCarbonIntensity(countryCode: string): Promise<number> {
    const value = MOCK_CARBON_INTENSITY[countryCode];
    if (value === undefined)
      throw new Error(`No mock data for country "${countryCode}"`);
    return value;
  }

  async getSortedEuropeRegionsByCarbon(): Promise<EuropeRegionCarbonEntry[]> {
    const regionCountryPair = Object.entries(EUROPE_AWS_REGION_COUNTRY);

    const results = await Promise.all(
      regionCountryPair.map(async ([region, country]) => ({
        region,
        carbonIntensity: await this.getCarbonIntensity(country),
      })),
    );

    return [
      { region: 'us-east-1', carbonIntensity: 400 },
      ...results.sort((a, b) => a.carbonIntensity - b.carbonIntensity),
    ];
  }

  async getCarbonIntensityFromDate(date: Date, region: string): Promise<number> {
    const regionToCountry: Record<string, string> = {
      'us-east-1': 'US',
      'us-west-1': 'US',
      'us-west-2': 'US',
      'eu-west-1': 'IE',
      'eu-central-1': 'DE',
      'eu-west-2': 'GB',
      'eu-west-3': 'FR',
      'eu-north-1': 'SE',
      'eu-south-1': 'IT',
    };

    const countryCode = regionToCountry[region] || 'US';
    return this.getCarbonIntensity(countryCode);
  }

  calculateLambdaCarbonFootprint(
    metrics: LambdaExecutionMetrics,
    carbonIntensity: number,
  ): CarbonFootprintResult {
    const memoryGB = metrics.memoryUsedMB / 1024;

    const durationHours = metrics.billedDurationMs / (1000 * 60 * 60);

    const powerWatts = memoryGB * 1000 * this.LAMBDA_POWER_PER_GB_MS;

    const energyKWh = (powerWatts * durationHours) / 1000;

    const carbonFootprintGCO2 = energyKWh * carbonIntensity;

    return {
      energyKWh,
      carbonFootprintGCO2,
      carbonIntensity,
    };
  }

  calculateTotalCarbonFootprint(
    executions: LambdaExecutionMetrics[],
    carbonIntensity: number,
  ): CarbonFootprintResult {
    let totalEnergy = 0;
    let totalCarbon = 0;

    for (const execution of executions) {
      const result = this.calculateLambdaCarbonFootprint(
        execution,
        carbonIntensity,
      );
      totalEnergy += result.energyKWh;
      totalCarbon += result.carbonFootprintGCO2;
    }

    return {
      energyKWh: totalEnergy,
      carbonFootprintGCO2: totalCarbon,
      carbonIntensity,
    };
  }
}
