import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  ResultField,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  GetResourcesCommand,
  ResourceGroupsTaggingAPIClient,
  TagFilter,
} from "@aws-sdk/client-resource-groups-tagging-api";

const LOG_GROUP_BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const KWH_PER_GB_SECOND = 0.00001667;

export interface LambdaExecutionMetadataInput {
  region: string;
  tagKey: string;
  tagValue?: string;
  startTime: Date;
  endTime: Date;
  carbonIntensityGCo2ePerKwh?: number;
  queryTimeoutMs?: number;
  cloudWatchLogsClient?: CloudWatchLogsClient;
  taggingClient?: ResourceGroupsTaggingAPIClient;
}

export interface LambdaExecutionMetrics {
  functionName: string;
  logGroupName: string;
  invocations: number;
  totalDurationMs: number;
  averageDurationMs: number;
  totalBilledDurationMs: number;
  averageBilledDurationMs: number;
  averageMemorySizeMb: number;
  averageMaxMemoryUsedMb: number;
  totalGbSeconds: number;
  estimatedEnergyKwh: number;
  estimatedEmissionsKgCo2e: number | null;
}

export interface LambdaExecutionMetadataResult {
  region: string;
  tag: {
    key: string;
    value?: string;
  };
  period: {
    startTime: string;
    endTime: string;
  };
  functionCount: number;
  totals: {
    invocations: number;
    totalDurationMs: number;
    totalBilledDurationMs: number;
    totalGbSeconds: number;
    estimatedEnergyKwh: number;
    estimatedEmissionsKgCo2e: number | null;
  };
  functions: LambdaExecutionMetrics[];
}

type QueryRow = Record<string, string>;

export async function getLambdaExecutionMetadataByTag(
  input: LambdaExecutionMetadataInput,
): Promise<LambdaExecutionMetadataResult> {
  const taggingClient =
    input.taggingClient ??
    new ResourceGroupsTaggingAPIClient({ region: input.region });
  const cloudWatchLogsClient =
    input.cloudWatchLogsClient ??
    new CloudWatchLogsClient({ region: input.region });

  const functionNames = await getLambdaFunctionNamesByTag(taggingClient, {
    tagKey: input.tagKey,
    tagValue: input.tagValue,
  });

  if (functionNames.length === 0) {
    return {
      region: input.region,
      tag: { key: input.tagKey, value: input.tagValue },
      period: {
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
      },
      functionCount: 0,
      totals: {
        invocations: 0,
        totalDurationMs: 0,
        totalBilledDurationMs: 0,
        totalGbSeconds: 0,
        estimatedEnergyKwh: 0,
        estimatedEmissionsKgCo2e:
          typeof input.carbonIntensityGCo2ePerKwh === "number" ? 0 : null,
      },
      functions: [],
    };
  }

  const logGroupNames = functionNames.map(
    (functionName) => `/aws/lambda/${functionName}`,
  );

  const rows = await queryReportMetrics(cloudWatchLogsClient, {
    logGroupNames,
    startTime: input.startTime,
    endTime: input.endTime,
    timeoutMs: input.queryTimeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  const metricsByFunction = new Map<string, LambdaExecutionMetrics>();

  for (const row of rows) {
    const functionName = row.functionName;
    const invocations = toNumber(row.invocations);
    const totalDurationMs = toNumber(row.totalDurationMs);
    const averageDurationMs = toNumber(row.avgDurationMs);
    const totalBilledDurationMs = toNumber(row.totalBilledDurationMs);
    const averageBilledDurationMs = toNumber(row.avgBilledDurationMs);
    const averageMemorySizeMb = toNumber(row.avgMemorySizeMb);
    const averageMaxMemoryUsedMb = toNumber(row.avgMaxMemoryUsedMb);
    const totalGbSeconds =
      (averageMemorySizeMb / 1024) * (totalDurationMs / 1000);
    const estimatedEnergyKwh = totalGbSeconds * KWH_PER_GB_SECOND;
    const estimatedEmissionsKgCo2e =
      typeof input.carbonIntensityGCo2ePerKwh === "number"
        ? estimatedEnergyKwh * (input.carbonIntensityGCo2ePerKwh / 1000)
        : null;

    metricsByFunction.set(functionName, {
      functionName,
      logGroupName: row.logGroup,
      invocations,
      totalDurationMs,
      averageDurationMs,
      totalBilledDurationMs,
      averageBilledDurationMs,
      averageMemorySizeMb,
      averageMaxMemoryUsedMb,
      totalGbSeconds,
      estimatedEnergyKwh,
      estimatedEmissionsKgCo2e,
    });
  }

  const functions = functionNames.map((functionName) => {
    return (
      metricsByFunction.get(functionName) ?? {
        functionName,
        logGroupName: `/aws/lambda/${functionName}`,
        invocations: 0,
        totalDurationMs: 0,
        averageDurationMs: 0,
        totalBilledDurationMs: 0,
        averageBilledDurationMs: 0,
        averageMemorySizeMb: 0,
        averageMaxMemoryUsedMb: 0,
        totalGbSeconds: 0,
        estimatedEnergyKwh: 0,
        estimatedEmissionsKgCo2e:
          typeof input.carbonIntensityGCo2ePerKwh === "number" ? 0 : null,
      }
    );
  });

  const totals = functions.reduce(
    (accumulator, item) => {
      accumulator.invocations += item.invocations;
      accumulator.totalDurationMs += item.totalDurationMs;
      accumulator.totalBilledDurationMs += item.totalBilledDurationMs;
      accumulator.totalGbSeconds += item.totalGbSeconds;
      accumulator.estimatedEnergyKwh += item.estimatedEnergyKwh;
      if (
        accumulator.estimatedEmissionsKgCo2e !== null &&
        item.estimatedEmissionsKgCo2e !== null
      ) {
        accumulator.estimatedEmissionsKgCo2e += item.estimatedEmissionsKgCo2e;
      }
      return accumulator;
    },
    {
      invocations: 0,
      totalDurationMs: 0,
      totalBilledDurationMs: 0,
      totalGbSeconds: 0,
      estimatedEnergyKwh: 0,
      estimatedEmissionsKgCo2e:
        typeof input.carbonIntensityGCo2ePerKwh === "number" ? 0 : null,
    },
  );

  return {
    region: input.region,
    tag: { key: input.tagKey, value: input.tagValue },
    period: {
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
    },
    functionCount: functionNames.length,
    totals,
    functions: functions.sort((left, right) =>
      left.functionName.localeCompare(right.functionName),
    ),
  };
}

async function getLambdaFunctionNamesByTag(
  client: ResourceGroupsTaggingAPIClient,
  input: {
    tagKey: string;
    tagValue?: string;
  },
): Promise<string[]> {
  const functionNames: string[] = [];
  let paginationToken: string | undefined;

  do {
    const tagFilters: TagFilter[] = [
      {
        Key: input.tagKey,
        Values: input.tagValue ? [input.tagValue] : undefined,
      },
    ];

    const response = await client.send(
      new GetResourcesCommand({
        PaginationToken: paginationToken,
        ResourceTypeFilters: ["lambda:function"],
        TagFilters: tagFilters,
      }),
    );

    for (const resourceTagMapping of response.ResourceTagMappingList ?? []) {
      if (!resourceTagMapping.ResourceARN) {
        continue;
      }

      const functionName = resourceTagMapping.ResourceARN.split(":").pop();
      if (functionName) {
        functionNames.push(functionName);
      }
    }

    paginationToken = response.PaginationToken || undefined;
  } while (paginationToken);

  return functionNames;
}

async function queryReportMetrics(
  client: CloudWatchLogsClient,
  input: {
    logGroupNames: string[];
    startTime: Date;
    endTime: Date;
    timeoutMs: number;
  },
): Promise<QueryRow[]> {
  const results: QueryRow[] = [];

  for (let index = 0; index < input.logGroupNames.length; index += LOG_GROUP_BATCH_SIZE) {
    const batch = input.logGroupNames.slice(index, index + LOG_GROUP_BATCH_SIZE);
    const queryId = await startInsightsQuery(client, {
      logGroupNames: batch,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    const rows = await waitForQueryResults(client, queryId, input.timeoutMs);
    results.push(...rows);
  }

  return results;
}

async function startInsightsQuery(
  client: CloudWatchLogsClient,
  input: {
    logGroupNames: string[];
    startTime: Date;
    endTime: Date;
  },
): Promise<string> {
  const response = await client.send(
    new StartQueryCommand({
      logGroupNames: input.logGroupNames,
      startTime: Math.floor(input.startTime.getTime() / 1000),
      endTime: Math.floor(input.endTime.getTime() / 1000),
      queryString: `
        fields @log, @message
        | filter @message like /REPORT RequestId:/
        | parse @message /^REPORT RequestId:\s[^ ]+\s+Duration: (?<durationMs>[\d.]+) ms\s+Billed Duration: (?<billedDurationMs>[\d.]+) ms\s+Memory Size: (?<memorySizeMb>[\d.]+) MB\s+Max Memory Used: (?<maxMemoryUsedMb>[\d.]+) MB.*/
        | parse @log /^.*\\/aws\\/lambda\\/(?<functionName>[^\\s]+)$/ 
        | stats
            count(*) as invocations,
            sum(durationMs) as totalDurationMs,
            avg(durationMs) as avgDurationMs,
            sum(billedDurationMs) as totalBilledDurationMs,
            avg(billedDurationMs) as avgBilledDurationMs,
            avg(memorySizeMb) as avgMemorySizeMb,
            avg(maxMemoryUsedMb) as avgMaxMemoryUsedMb
          by functionName, @log
        | sort functionName asc
      `,
    }),
  );

  if (!response.queryId) {
    throw new Error("CloudWatch Logs Insights did not return a query id.");
  }

  return response.queryId;
}

async function waitForQueryResults(
  client: CloudWatchLogsClient,
  queryId: string,
  timeoutMs: number,
): Promise<QueryRow[]> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await client.send(
      new GetQueryResultsCommand({
        queryId,
      }),
    );

    if (response.status === "Complete") {
      return (response.results ?? []).map(mapResultRow);
    }

    if (
      response.status === "Failed" ||
      response.status === "Cancelled" ||
      response.status === "Timeout" ||
      response.status === "Unknown"
    ) {
      throw new Error(
        `CloudWatch Logs Insights query ${queryId} finished with status ${response.status}.`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for CloudWatch Logs Insights query ${queryId}.`);
}

function mapResultRow(resultFields: ResultField[]): QueryRow {
  const row: QueryRow = {};

  for (const field of resultFields) {
    if (field.field && field.value) {
      row[field.field] = field.value;
    }
  }

  if (row["@log"]) {
    row.logGroup = row["@log"];
  }

  return row;
}

function toNumber(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
