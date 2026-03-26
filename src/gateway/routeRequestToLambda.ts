import { Lambda } from "@aws-sdk/client-lambda";
import { getSortedEuropeRegionsByCarbon } from "../logic/sortRegionsByCarbonFootprint.js";
import { env } from "../env.js";

export async function greenHandler(handlerName: string, args?: Record<string, unknown>): Promise<unknown> {
  const regions = await getSortedEuropeRegionsByCarbon();

//   const leastCarbonRegion = regions[0].region;
  const leastCarbonRegion = "us-east-1"

  const lambda = new Lambda({
    region: leastCarbonRegion,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const response = await lambda.invoke({
    FunctionName: handlerName,
    Payload: args !== undefined
      ? new TextEncoder().encode(JSON.stringify(args))
      : undefined,
  });

  const result = response.Payload
    ? JSON.parse(Buffer.from(response.Payload).toString("utf-8"))
    : null;

  return result;
}

greenHandler("acme-corp-payment-processor").then(console.log)