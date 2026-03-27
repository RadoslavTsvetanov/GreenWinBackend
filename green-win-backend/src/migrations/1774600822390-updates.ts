import { MigrationInterface, QueryRunner } from "typeorm";

export class Updates1774600822390 implements MigrationInterface {
    name = 'Updates1774600822390'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "executionDate"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "startDate"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "endDate"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "periodicity"`);
        await queryRunner.query(`DROP TYPE "public"."task_executions_periodicity_enum"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "executionWindows"`);
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "isEnabled"`);
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."task_strategies_type_enum"`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "rangeStart" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "rangeEnd" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE TYPE "public"."task_strategies_periodicity_enum" AS ENUM('once', 'daily', 'weekly', 'monthly')`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "periodicity" "public"."task_strategies_periodicity_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "executionTime" text`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "dayOfWeek" smallint`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "dayOfMonth" smallint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "dayOfMonth"`);
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "dayOfWeek"`);
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "executionTime"`);
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "periodicity"`);
        await queryRunner.query(`DROP TYPE "public"."task_strategies_periodicity_enum"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "rangeEnd"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "rangeStart"`);
        await queryRunner.query(`CREATE TYPE "public"."task_strategies_type_enum" AS ENUM('immediately', 'daily', 'weekly', 'monthly', 'yearly', 'custom', 'daily_at_times', 'daily_in_range')`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "type" "public"."task_strategies_type_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "isEnabled" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "executionWindows" jsonb`);
        await queryRunner.query(`CREATE TYPE "public"."task_executions_periodicity_enum" AS ENUM('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "periodicity" "public"."task_executions_periodicity_enum" NOT NULL DEFAULT 'once'`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "endDate" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "startDate" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "executionDate" TIMESTAMP WITH TIME ZONE`);
    }

}
