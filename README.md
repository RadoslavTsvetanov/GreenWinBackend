# GreenWinBackend

Minimal TypeScript utility for selecting the AWS region with the lowest current electricity carbon intensity.

Recommended data source: [Electricity Maps](https://app.electricitymaps.com/docs). Its API supports direct data-center lookups with `dataCenterProvider=aws` and `dataCenterRegion=<aws-region>`, which makes it a practical fit for live AWS region selection.



## Usage

```ts
import {
  ElectricityMapsClient,
  findMostCarbonFriendlyAwsRegion
} from "./src/index.ts";

const carbonDataProvider = new ElectricityMapsClient({
  apiKey: process.env.ELECTRICITY_MAPS_API_KEY
});

const result = await findMostCarbonFriendlyAwsRegion({
  carbonDataProvider,
  regions: ["eu-north-1", "eu-west-1", "us-east-1"],
  allowEstimatedData: false
});

console.log(result.selectedRegion);
```

## Tests

```bash
bun test
```
