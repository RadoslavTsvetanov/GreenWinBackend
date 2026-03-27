import { MigrationInterface, QueryRunner } from "typeorm";

export class Simplifying1774613577152 implements MigrationInterface {
    name = 'Simplifying1774613577152'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "logsUri"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "lambdaS3Key"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "dockerImage"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "allowedCloudProviders"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "allowedRegions"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "earliestStartAt"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "latestFinishAt"`);
        await queryRunner.query(`ALTER TYPE "public"."task_executions_status_enum" RENAME TO "task_executions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."task_executions_status_enum" AS ENUM('pending', 'succeeded', 'failed')`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" TYPE "public"."task_executions_status_enum" USING "status"::"text"::"public"."task_executions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."task_executions_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."task_executions_status_enum_old" AS ENUM('pending', 'running', 'succeeded', 'failed', 'canceled', 'timed_out', 'retrying')`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" TYPE "public"."task_executions_status_enum_old" USING "status"::"text"::"public"."task_executions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."task_executions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."task_executions_status_enum_old" RENAME TO "task_executions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "latestFinishAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "earliestStartAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "allowedRegions" text array`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "allowedCloudProviders" text array`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "dockerImage" text`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "lambdaS3Key" text`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "logsUri" text`);
    }

}
