import { MigrationInterface, QueryRunner } from "typeorm";

export class Times1774584894363 implements MigrationInterface {
    name = 'Times1774584894363'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "times" jsonb`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ADD "timeRanges" jsonb`);
        await queryRunner.query(`ALTER TYPE "public"."task_strategies_type_enum" RENAME TO "task_strategies_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."task_strategies_type_enum" AS ENUM('immediately', 'daily', 'weekly', 'monthly', 'yearly', 'custom', 'daily_at_times', 'daily_in_range')`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ALTER COLUMN "type" TYPE "public"."task_strategies_type_enum" USING "type"::"text"::"public"."task_strategies_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."task_strategies_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."task_strategies_type_enum_old" AS ENUM('immediately', 'daily', 'weekly', 'monthly', 'yearly', 'custom')`);
        await queryRunner.query(`ALTER TABLE "task_strategies" ALTER COLUMN "type" TYPE "public"."task_strategies_type_enum_old" USING "type"::"text"::"public"."task_strategies_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."task_strategies_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."task_strategies_type_enum_old" RENAME TO "task_strategies_type_enum"`);
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "timeRanges"`);
        await queryRunner.query(`ALTER TABLE "task_strategies" DROP COLUMN "times"`);
    }

}
