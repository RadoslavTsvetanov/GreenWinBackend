export const AWS_REGIONS = [
  // US
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  // Africa
  'af-south-1',
  // Asia Pacific
  'ap-east-1',
  'ap-east-2',
  'ap-south-1',
  'ap-south-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ap-southeast-5',
  'ap-southeast-6',
  'ap-southeast-7',
  // Canada
  'ca-central-1',
  'ca-west-1',
  // Europe
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'eu-south-1',
  'eu-south-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  // Israel
  'il-central-1',
  // Mexico
  'mx-central-1',
  // Middle East
  'me-central-1',
  'me-south-1',
  // South America
  'sa-east-1',
];

// Maps each European AWS region to the country it's physically located in
export const EUROPE_AWS_REGION_COUNTRY: Record<string, string> = {
  'eu-central-1': 'DE', // Frankfurt, Germany
  'eu-central-2': 'CH', // Zurich, Switzerland
  'eu-north-1': 'SE', // Stockholm, Sweden
  'eu-south-1': 'IT', // Milan, Italy
  'eu-south-2': 'ES', // Spain
  'eu-west-1': 'IE', // Ireland
  'eu-west-2': 'GB', // London, United Kingdom
  'eu-west-3': 'FR', // Paris, France
};
