import { MigrationInterface, QueryRunner } from "typeorm";

export class IsEnabledMovedToTaskStrategy1774568533383 implements MigrationInterface {
    name = 'IsEnabledMovedToTaskStrategy1774568533383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "runMode" TO "parameterSchema"`);
        await queryRunner.query(`ALTER TYPE "public"."tasks_runmode_enum" RENAME TO "tasks_parameterschema_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."task_strategies_type_enum" AS ENUM('immediately', 'daily', 'weekly', 'monthly', 'yearly', 'custom')`);
        await queryRunner.query(`CREATE TABLE "task_strategies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isEnabled" boolean NOT NULL DEFAULT true, "type" "public"."task_strategies_type_enum" NOT NULL, "cronExpression" text, "parameters" jsonb, "isActive" boolean NOT NULL DEFAULT false, "activatedAt" TIMESTAMP WITH TIME ZONE, "lastFiredAt" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "taskId" uuid, CONSTRAINT "PK_9051420b63cec6f4c5b947ddb82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "organization_id" uuid`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "parameterSchema"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "parameterSchema" jsonb`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_21a659804ed7bf61eb91688dea7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD CONSTRAINT "FK_6a752aab1cd42c56f15504872eb" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP CONSTRAINT "FK_6a752aab1cd42c56f15504872eb"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_21a659804ed7bf61eb91688dea7"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "parameterSchema"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "parameterSchema" "public"."tasks_parameterschema_enum" NOT NULL DEFAULT 'immediate'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "organization_id"`);
        await queryRunner.query(`DROP TABLE "task_strategies"`);
        await queryRunner.query(`DROP TYPE "public"."task_strategies_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tasks_parameterschema_enum" RENAME TO "tasks_runmode_enum"`);
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "parameterSchema" TO "runMode"`);
    }

}
