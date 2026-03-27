import { Injectable } from '@nestjs/common';
import { EUROPE_AWS_REGION_COUNTRY } from './constants/aws-regions';

// Static mock carbon intensity values (gCO₂eq/kWh) per country code
const MOCK_CARBON_INTENSITY: Record<string, number> = {
  DE: 350, // Germany
  CH: 18, // Switzerland
  SE: 13, // Sweden
  IT: 233, // Italy
  ES: 165, // Spain
  IE: 290, // Ireland
  GB: 210, // United Kingdom
  FR: 56, // France
  US: 40, // United States (average)
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
  // Power consumption constants for Lambda
  // Based on AWS Lambda power consumption estimates
  private readonly LAMBDA_POWER_PER_GB_MS = 0.0000166667; // Watts per GB-ms

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
    // TODO: Integrate with real-time carbon intensity API
    // For now, return mock data based on region
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

  /**
   * Calculate carbon footprint for a Lambda execution
   * Formula:
   * 1. Energy (kWh) = Power (W) × Time (h)
   * 2. Power (W) = Memory (GB) × Power per GB-ms × Duration (ms)
   * 3. Carbon Footprint (gCO2) = Energy (kWh) × Carbon Intensity (gCO2/kWh)
   */
  calculateLambdaCarbonFootprint(
    metrics: LambdaExecutionMetrics,
    carbonIntensity: number,
  ): CarbonFootprintResult {
    // Memory in GB
    const memoryGB = metrics.memoryUsedMB / 1024;

    // Duration in hours
    const durationHours = metrics.billedDurationMs / (1000 * 60 * 60);

    // Power consumption in Watts
    const powerWatts = memoryGB * 1000 * this.LAMBDA_POWER_PER_GB_MS;

    // Energy consumption in kWh
    const energyKWh = (powerWatts * durationHours) / 1000;

    // Carbon footprint in gCO2
    const carbonFootprintGCO2 = energyKWh * carbonIntensity;

    return {
      energyKWh,
      carbonFootprintGCO2,
      carbonIntensity,
    };
  }

  /**
   * Calculate total carbon footprint for multiple Lambda executions
   */
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
