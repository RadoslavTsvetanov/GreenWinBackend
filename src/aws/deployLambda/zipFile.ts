import {
  LambdaClient,
  CreateFunctionCommand,
  Runtime,
  PackageType,
} from "@aws-sdk/client-lambda";
import { env } from "../../env.js";

export interface DeployLambdaInput {
  zipFile: Uint8Array;
  workloadName: string;
  organization: string;
  region: string;
  roleArn: string;
  runtime?: Runtime;
  handler?: string;
}

export async function deployLambda({
  zipFile,
  workloadName,
  organization,
  region,
  roleArn,
  runtime = Runtime.nodejs20x,
  handler = "index.handler",
}: DeployLambdaInput): Promise<string> {
  const client = new LambdaClient({ 
    region,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
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
    })
  );

  if (!response.FunctionArn) {
    throw new Error(`Lambda deployment failed for "${functionName}".`);
  }

  return response.FunctionArn;
}
