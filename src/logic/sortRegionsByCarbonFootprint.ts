import { getCarbonIntensity } from "../carbon-api/getCarbonIntensity.js";
import { EUROPE_AWS_REGION_COUNTRY } from "../consts/awsRegions.js";


export interface EuropeRegionCarbonEntry {
  region: string;
  carbonIntensity: number;
}

export async function getSortedEuropeRegionsByCarbon(): Promise<EuropeRegionCarbonEntry[]> {
  const regionCountryPair = Object.keys(EUROPE_AWS_REGION_COUNTRY);

  const results = await Promise.all(
    regionCountryPair.map(async (region) => ({
      region,
      carbonIntensity: await getCarbonIntensity(region),
    }))
  );

  return results.sort((a, b) => a.carbonIntensity - b.carbonIntensity);
}

getSortedEuropeRegionsByCarbon().then(console.log)