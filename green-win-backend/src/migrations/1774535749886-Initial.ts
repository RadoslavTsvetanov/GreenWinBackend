import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1774535749886 implements MigrationInterface {
    name = 'Initial1774535749886'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "checkpoints" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "uri" text NOT NULL, "step" integer, "epoch" integer, "metrics" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "taskId" uuid, "executionId" uuid, CONSTRAINT "PK_dfcc46a91d96ecba8a8dcd8b11c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."task_executions_status_enum" AS ENUM('pending', 'running', 'succeeded', 'failed', 'canceled')`);
        await queryRunner.query(`CREATE TABLE "task_executions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."task_executions_status_enum" NOT NULL DEFAULT 'pending', "provider" character varying, "region" character varying, "scheduledAt" TIMESTAMP WITH TIME ZONE, "startedAt" TIMESTAMP WITH TIME ZONE, "finishedAt" TIMESTAMP WITH TIME ZONE, "metrics" jsonb, "errorMessage" text, "logsUri" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "taskId" uuid, CONSTRAINT "PK_c7eaf7e1f306ae5b1938e759152" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_codetype_enum" AS ENUM('lambda', 'docker')`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_runmode_enum" AS ENUM('immediate', 'scheduled')`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum" AS ENUM('draft', 'queued', 'running', 'succeeded', 'failed', 'postponed')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "codeType" "public"."tasks_codetype_enum" NOT NULL DEFAULT 'lambda', "lambdaCode" text, "dockerImage" text, "allowedCloudProviders" text array, "allowedRegions" text array, "runMode" "public"."tasks_runmode_enum" NOT NULL DEFAULT 'immediate', "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'draft', "earliestStartAt" TIMESTAMP WITH TIME ZONE, "latestFinishAt" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ownerId" uuid, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "name" character varying, "default_cloud_providers" text array, "default_regions" text array, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "checkpoints" ADD CONSTRAINT "FK_99f37f5d6667e5f7c0b44e67bd8" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "checkpoints" ADD CONSTRAINT "FK_788100c90373d816a5704da0b76" FOREIGN KEY ("executionId") REFERENCES "task_executions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD CONSTRAINT "FK_313cf125e389752f88bcf8b9f39" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_607de52438268ab19a406349427" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_607de52438268ab19a406349427"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP CONSTRAINT "FK_313cf125e389752f88bcf8b9f39"`);
        await queryRunner.query(`ALTER TABLE "checkpoints" DROP CONSTRAINT "FK_788100c90373d816a5704da0b76"`);
        await queryRunner.query(`ALTER TABLE "checkpoints" DROP CONSTRAINT "FK_99f37f5d6667e5f7c0b44e67bd8"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_runmode_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_codetype_enum"`);
        await queryRunner.query(`DROP TABLE "task_executions"`);
        await queryRunner.query(`DROP TYPE "public"."task_executions_status_enum"`);
        await queryRunner.query(`DROP TABLE "checkpoints"`);
    }

}
