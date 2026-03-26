import { Runtime } from "@aws-sdk/client-lambda";
import { deployLambda } from "./zipFile.js";
import { zipSync, strToU8 } from "fflate";

export function createZip(files: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files)) {
    entries[name] = strToU8(content);
  }
  return zipSync(entries);
}


function deployToMultipleRegions(zipFile: Uint8Array, workloadName: string, organization: string, roleArn: string, runtime = Runtime.nodejs20x, handler = "index.handler") {
    const regions = ["us-east-1"]
    return Promise.all(
        regions.map(region => deployLambda(
            {
                zipFile,
                workloadName,
                organization,
                region,
                roleArn,
                runtime,
                handler,
            }
        ))
    )
}

// Example usage — zip a handler inline and deploy
const zipFile = createZip({
  "index.js": `exports.handler = async () => ({ statusCode: 200, body: "ok" });`,
});

const arns = await deployToMultipleRegions(
  zipFile,
  "payment-processor",
  "acme-corp",
  "arn:aws:iam::982479883166:role/our-backend-to-create-lambdas",
);

console.log("Deployed to:", arns);
