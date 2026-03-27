import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Lambda, waitUntilFunctionActive } from '@aws-sdk/client-lambda';
import { CarbonService } from '../carbon/carbon.service';

export interface LambdaInvocationResult {
  payload: unknown;
  region: string;
  metrics: {
    durationMs: number;
    billedDurationMs: number;
    memorySizeMb: number;
    maxMemoryUsedMb: number;
    estimatedEnergyKwh: number;
    carbonIntensityGco2PerKwh: number;
    estimatedEmissionsGco2: number;
  };
}

@Injectable()
export class LambdaService {
  private readonly logger = new Logger(LambdaService.name);

  constructor(
    private readonly carbonService: CarbonService,
    private readonly configService: ConfigService,
  ) {}

  async invokeGreenHandler(
    handlerName: string,
    args?: Record<string, unknown>,
  ): Promise<LambdaInvocationResult> {
    const regions = await this.carbonService.getSortedEuropeRegionsByCarbon();
    const leastCarbonRegion = regions[0].region;
    const carbonIntensity = regions[0].carbonIntensity;

    const lambda = new Lambda({
      region: leastCarbonRegion,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') as string,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ) as string,
      },
    });

    await waitUntilFunctionActive(
      { client: lambda, maxWaitTime: 60 },
      { FunctionName: handlerName },
    );

    const response = await lambda.invoke({
      FunctionName: handlerName,
      LogType: 'Tail',
      Payload:
        args !== undefined
          ? new TextEncoder().encode(JSON.stringify(args))
          : undefined,
    });

    const payload = response.Payload
      ? JSON.parse(Buffer.from(response.Payload).toString('utf-8'))
      : null;

    const awsMetrics = this.parseLogResult(response.LogResult);

    const powerKw = (awsMetrics.memorySizeMb / 1024) * 0.0000000667;
    const durationHours = awsMetrics.durationMs / 1000 / 3600;
    const estimatedEnergyKwh = powerKw * durationHours;

    const estimatedEmissionsGco2 = estimatedEnergyKwh * carbonIntensity;

    const metrics = {
      ...awsMetrics,
      estimatedEnergyKwh,
      carbonIntensityGco2PerKwh: carbonIntensity,
      estimatedEmissionsGco2,
    };

    this.logger.log(
      `Lambda ${handlerName} executed in ${leastCarbonRegion}: ` +
        `${awsMetrics.durationMs}ms, ${awsMetrics.maxMemoryUsedMb}/${awsMetrics.memorySizeMb}MB, ` +
        `~${estimatedEmissionsGco2.toFixed(6)} gCO2`,
    );

    return { payload, region: leastCarbonRegion, metrics };
  }

  private parseLogResult(logResult?: string): {
    durationMs: number;
    billedDurationMs: number;
    memorySizeMb: number;
    maxMemoryUsedMb: number;
  } {
    const defaults = {
      durationMs: 0,
      billedDurationMs: 0,
      memorySizeMb: 128,
      maxMemoryUsedMb: 0,
    };

    if (!logResult) return defaults;

    try {
      const decoded = Buffer.from(logResult, 'base64').toString('utf-8');
      const reportLine = decoded.split('\n').find((l) => l.startsWith('REPORT'));
      if (!reportLine) return defaults;

      const duration = reportLine.match(/Duration:\s*([\d.]+)\s*ms/);
      const billed = reportLine.match(/Billed Duration:\s*([\d.]+)\s*ms/);
      const memSize = reportLine.match(/Memory Size:\s*(\d+)\s*MB/);
      const maxMem = reportLine.match(/Max Memory Used:\s*(\d+)\s*MB/);

      return {
        durationMs: duration ? parseFloat(duration[1]) : 0,
        billedDurationMs: billed ? parseFloat(billed[1]) : 0,
        memorySizeMb: memSize ? parseInt(memSize[1], 10) : 128,
        maxMemoryUsedMb: maxMem ? parseInt(maxMem[1], 10) : 0,
      };
    } catch {
      this.logger.warn('Failed to parse Lambda log result');
      return defaults;
    }
  }
}
