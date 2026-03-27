import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Lambda } from '@aws-sdk/client-lambda';
import { CarbonService } from '../carbon/carbon.service';

@Injectable()
export class LambdaService {
  constructor(
    private readonly carbonService: CarbonService,
    private readonly configService: ConfigService,
  ) {}

  async invokeGreenHandler(
    handlerName: string,
    args?: Record<string, unknown>,
  ): Promise<unknown> {
    const regions = await this.carbonService.getSortedEuropeRegionsByCarbon();
    const leastCarbonRegion = "us-east-1"
    // const leastCarbonRegion = regions[0].region;

    const lambda = new Lambda({
      region: leastCarbonRegion,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') as string,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ) as string,
      },
    });

    const response = await lambda.invoke({
      FunctionName: handlerName,
      Payload:
        args !== undefined
          ? new TextEncoder().encode(JSON.stringify(args))
          : undefined,
    });

    const result = response.Payload
      ? JSON.parse(Buffer.from(response.Payload).toString('utf-8'))
      : null;

    return result;
  }
}
