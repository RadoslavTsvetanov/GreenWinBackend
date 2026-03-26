import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LambdaClient,
  CreateFunctionCommand,
  Runtime,
  PackageType,
} from '@aws-sdk/client-lambda';
import { zipSync, strToU8 } from 'fflate';

export interface DeployLambdaInput {
  workloadName: string;
  organization: string;
  regions: string[];
  roleArn: string;
  handlerCode: Record<string, string>;
  runtime?: Runtime;
  handler?: string;
}

@Injectable()
export class AwsDeployService {
  constructor(private readonly configService: ConfigService) {}

  private createZip(files: Record<string, string>): Uint8Array {
    const entries: Record<string, Uint8Array> = {};
    for (const [name, content] of Object.entries(files)) {
      entries[name] = strToU8(content);
    }
    return zipSync(entries);
  }

  private async deployLambdaToRegion(
    zipFile: Uint8Array,
    workloadName: string,
    organization: string,
    region: string,
    roleArn: string,
    runtime: Runtime,
    handler: string,
  ): Promise<string> {
    const client = new LambdaClient({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') as string,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ) as string,
      },
    });

    const functionName = `${organization}-${workloadName}`;

    const response = await client.send(
      new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: runtime,
        Role: roleArn,
        Handler: handler,
        PackageType: PackageType.Zip,
        Code: { ZipFile: zipFile },
        Tags: {
          organization,
          workload: workloadName,
        },
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
    handlerCode,
    runtime = Runtime.nodejs20x,
    handler = 'index.handler',
  }: DeployLambdaInput): Promise<string[]> {
    const zipFile = this.createZip(handlerCode);

    return Promise.all(
      regions.map((region) =>
        this.deployLambdaToRegion(
          zipFile,
          workloadName,
          organization,
          region,
          roleArn,
          runtime,
          handler,
        ),
      ),
    );
  }
}
