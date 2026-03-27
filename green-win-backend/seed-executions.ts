import { Client } from "pg";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config({ path: ".env" });
dotenv.config({ path: "../.env" });

const TOTAL = 100;

const REGIONS = [
  "us-east-1",
  "eu-west-1",
  "eu-central-1",
  "eu-north-1",
  "ap-southeast-1",
];

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildMetrics() {
  const durationMs = rand(40, 60);
  const memorySizeMb = 128;
  const maxMemoryUsedMb = randInt(40, 60);
  const billedDurationMs = Math.ceil(durationMs);
  const estimatedEnergyKwh = rand(40, 60);
  const carbonIntensityGco2PerKwh = rand(40, 60);
  const estimatedEmissionsGco2 = rand(40, 60);

  return {
    durationMs: +durationMs.toFixed(2),
    memorySizeMb,
    maxMemoryUsedMb,
    billedDurationMs,
    estimatedEnergyKwh: +estimatedEnergyKwh.toFixed(4),
    estimatedEmissionsGco2: +estimatedEmissionsGco2.toFixed(4),
    carbonIntensityGco2PerKwh: +carbonIntensityGco2PerKwh.toFixed(2),
  };
}

async function main() {
  const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;

  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "greenwin",
    ssl,
  });

  await client.connect();
  console.log("Connected to database");

  const ownerRow = await client.query(`SELECT id FROM users LIMIT 1`);
  if (ownerRow.rows.length === 0) {
    console.error("No users found in the database. Please create a user first.");
    await client.end();
    process.exit(1);
  }
  const ownerId = ownerRow.rows[0].id;
  console.log(`Using owner: ${ownerId}`);

  const projectRow = await client.query(`SELECT id FROM projects LIMIT 1`);
  const projectId = projectRow.rows.length > 0 ? projectRow.rows[0].id : null;
  console.log(`Using project: ${projectId ?? "(none)"}`);

  const taskIds: string[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const taskId = crypto.randomUUID();
    const taskName = `Seed Task ${i + 1}`;
    const description = `Auto-generated seed task #${i + 1}`;
    const codeType = "lambda";
    const status = "succeeded";

    await client.query(
      `INSERT INTO tasks (id, name, description, "codeType", status, "ownerId", "projectId")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [taskId, taskName, description, codeType, status, ownerId, projectId],
    );
    taskIds.push(taskId);
  }

  console.log(`Created ${TOTAL} tasks`);

  for (let i = 0; i < TOTAL; i++) {
    const execId = crypto.randomUUID();
    const taskId = taskIds[i];
    const region = pickRandom(REGIONS);
    const metrics = buildMetrics();
    const now = new Date();
    const scheduledAt = new Date(
      now.getTime() - randInt(0, 7 * 24 * 60 * 60 * 1000),
    );
    const startedAt = new Date(scheduledAt.getTime() + randInt(100, 3000));
    const finishedAt = new Date(
      startedAt.getTime() + metrics.billedDurationMs,
    );

    await client.query(
      `INSERT INTO task_executions
         (id, status, provider, region, "scheduledAt", "startedAt", "finishedAt", metrics, "taskId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        execId,
        "succeeded",
        "aws",
        region,
        scheduledAt,
        startedAt,
        finishedAt,
        JSON.stringify(metrics),
        taskId,
      ],
    );
  }

  console.log(`Created ${TOTAL} task executions with metrics in 40-60 range`);
  await client.end();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
