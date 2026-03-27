import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LambdaClient,
  CreateFunctionCommand,
  Runtime,
  PackageType,
} from '@aws-sdk/client-lambda';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

export interface DeployLambdaInput {
  workloadName: string;
  organization: string;
  projectId: string;
  regions: string[];
  roleArn: string;
  /** Pre-built zip buffer to deploy directly. */
  zipBuffer: Buffer;
  runtime?: Runtime;
  handler?: string;
}

@Injectable()
export class AwsDeployService {
  constructor(private readonly configService: ConfigService) {}

  private async deployLambdaToRegion(
    zipFile: Uint8Array,
    workloadName: string,
    organization: string,
    projectId: string,
    region: string,
    roleArn: string,
    runtime: Runtime,
    handler: string,
  ): Promise<string> {
    const client = new LambdaClient({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') as string,
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') as string,
      },
    });

    const functionName = `${organization}-${projectId}-${workloadName}`;

    const response = await client.send(
      new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: runtime,
        Role: roleArn,
        Handler: handler,
        PackageType: PackageType.Zip,
        Code: { ZipFile: zipFile },
        Tags: { organization, workload: workloadName },
      }),
    );

    if (!response.FunctionArn) {
      throw new Error(`Lambda deployment failed for "${functionName}".`);
    }

    return response.FunctionArn;
  }

  async deployToMultipleRegions({
    workloadName,
    organization,
    regions,
    roleArn,
    projectId,
    zipBuffer,
    runtime = Runtime.nodejs20x,
    handler = 'index.handler',
  }: DeployLambdaInput): Promise<string[]> {
    return Promise.all(
      regions.map((region) =>
        this.deployLambdaToRegion(zipBuffer, workloadName, organization, projectId, region, roleArn, runtime, handler),
      ),
    );
  }
}
