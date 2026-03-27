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
};

export interface EuropeRegionCarbonEntry {
  region: string;
  carbonIntensity: number;
}

@Injectable()
export class CarbonService {
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

    return [{region:"us-east-1", carbonIntensity: 56},...results.sort((a, b) => a.carbonIntensity - b.carbonIntensity)]
  }
}
