import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  US: 400,
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
  private readonly electricityMapsToken: string;

  constructor(private readonly configService: ConfigService) {
    this.electricityMapsToken = this.configService.get<string>(
      'ELECTRICITY_MAPS_TOKEN',
      '',
    );
  }

  async getCarbonIntensity(countryCode: string): Promise<number> {
    // Try to fetch from Electricity Maps API if token is available

    const res = await fetch(
      `https://api.electricitymaps.com/v3/carbon-intensity/latest?zone=${countryCode}`,
      {
        method: 'GET',
        headers: {
          'auth-token': this.electricityMapsToken,
        },
      },
    );


    const data = await res.json();
    return data.carbonIntensity || MOCK_CARBON_INTENSITY[countryCode] || 400;
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

  async getCarbonIntensityFromDate(
    date: Date,
    region: string,
  ): Promise<number> {
    const regionToZone: Record<string, string> = {
      'us-east-1': 'US-EAST',
      'us-west-1': 'US-CAL',
      'us-west-2': 'US-NW',
      'eu-west-1': 'IE',
      'eu-central-1': 'DE',
      'eu-west-2': 'GB',
      'eu-west-3': 'FR',
      'eu-north-1': 'SE',
      'eu-south-1': 'IT',
    };

    const zone = regionToZone[region] || 'US-EAST';

    // Try Electricity Maps API if token available
    if (this.electricityMapsToken) {
      try {
        const res = await fetch(
          `https://api.electricitymaps.com/v3/carbon-intensity/past?zone=${zone}&datetime=${date.toISOString()}`,
          {
            method: 'GET',
            headers: {
              'auth-token': this.electricityMapsToken,
            },
          },
        );

        if (res.ok) {
          const data = await res.json();
          return data.carbonIntensity || 400;
        }
      } catch (error) {
        console.error('Error fetching from Electricity Maps:', error);
      }
    }

    // Fallback to mock data
    return this.getCarbonIntensity(zone);
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
