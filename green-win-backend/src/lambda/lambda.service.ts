import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Lambda } from '@aws-sdk/client-lambda';
import { CarbonService } from '../carbon/carbon.service';

export interface LambdaInvocationResult {
  /** The parsed response payload from the lambda. */
  payload: unknown;
  /** The AWS region the lambda was invoked in. */
  region: string;
  /** Execution metrics extracted from AWS + mock carbon calculation. */
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
      LogType: 'Tail',
      Payload:
        args !== undefined
          ? new TextEncoder().encode(JSON.stringify(args))
          : undefined,
    });

    const payload = response.Payload
      ? JSON.parse(Buffer.from(response.Payload).toString('utf-8'))
      : null;

    // Parse execution metrics from the base64-encoded log tail
    const awsMetrics = this.parseLogResult(response.LogResult);

    // Estimate energy: power (kW) * time (h)
    // AWS Lambda ~0.0000000667 kW per MB (rough estimate)
    const powerKw = (awsMetrics.memorySizeMb / 1024) * 0.0000000667;
    const durationHours = awsMetrics.durationMs / 1000 / 3600;
    const estimatedEnergyKwh = powerKw * durationHours;

    // Mock carbon calculation using existing CarbonService data
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

  /**
   * Parse the REPORT line from the base64-encoded Lambda log tail.
   * Example REPORT line:
   * REPORT RequestId: xxx Duration: 12.34 ms Billed Duration: 13 ms Memory Size: 128 MB Max Memory Used: 56 MB
   */
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
