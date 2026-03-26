// Static mock carbon intensity values (gCO₂eq/kWh) per country code
const MOCK_CARBON_INTENSITY: Record<string, number> = {
  DE: 350, // Germany
  CH: 18,  // Switzerland
  SE: 13,  // Sweden
  IT: 233, // Italy
  ES: 165, // Spain
  IE: 290, // Ireland
  GB: 210, // United Kingdom
  FR: 56,  // France
};

export async function getCarbonIntensity(countryCode: string): Promise<number> {
  const value = MOCK_CARBON_INTENSITY[countryCode];
  if (value === undefined) throw new Error(`No mock data for country "${countryCode}"`);
  return value;
}
