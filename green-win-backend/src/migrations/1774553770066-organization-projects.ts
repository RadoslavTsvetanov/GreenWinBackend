import { MigrationInterface, QueryRunner } from "typeorm";

export class OrganizationProjects1774553770066 implements MigrationInterface {
    name = 'OrganizationProjects1774553770066'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "email" character varying NOT NULL, "contactPerson" character varying, "phoneNumber" character varying, "address" character varying, "monthlyEmissionsTarget" numeric(10,2), "currentMonthEmissions" numeric(10,2) DEFAULT '0', "totalEmissions" numeric(10,2) DEFAULT '0', "annualEmissionsTarget" numeric(10,2), "totalTasksExecuted" integer NOT NULL DEFAULT '0', "totalEnergySaved" numeric(10,2) DEFAULT '0', "emissionsMetadata" jsonb, "preferredCloudProviders" text array, "preferredRegions" text array, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9b7ca6d30b94fef571cff876884" UNIQUE ("name"), CONSTRAINT "UQ_4ad920935f4d4eb73fc58b40f72" UNIQUE ("email"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "emissionsTarget" numeric(10,2), "currentEmissions" numeric(10,2) NOT NULL DEFAULT '0', "totalCostSavings" numeric(10,2) NOT NULL DEFAULT '0', "totalEnergySaved" numeric(10,2) NOT NULL DEFAULT '0', "completedTasks" integer NOT NULL DEFAULT '0', "metadata" jsonb, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "executionDate" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "startDate" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "endDate" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE TYPE "public"."task_executions_periodicity_enum" AS ENUM('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "periodicity" "public"."task_executions_periodicity_enum" NOT NULL DEFAULT 'once'`);
        await queryRunner.query(`ALTER TABLE "task_executions" ADD "executionWindows" jsonb`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "projectId" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."task_executions_status_enum" RENAME TO "task_executions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."task_executions_status_enum" AS ENUM('pending', 'running', 'succeeded', 'failed', 'canceled', 'timed_out', 'retrying')`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" TYPE "public"."task_executions_status_enum" USING "status"::"text"::"public"."task_executions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."task_executions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_eec93fd979bdcf5a0141da324d6" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_e08fca67ca8966e6b9914bf2956" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_e08fca67ca8966e6b9914bf2956"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_eec93fd979bdcf5a0141da324d6"`);
        await queryRunner.query(`CREATE TYPE "public"."task_executions_status_enum_old" AS ENUM('pending', 'running', 'succeeded', 'failed', 'canceled')`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" TYPE "public"."task_executions_status_enum_old" USING "status"::"text"::"public"."task_executions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "task_executions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."task_executions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."task_executions_status_enum_old" RENAME TO "task_executions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "projectId"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "executionWindows"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "periodicity"`);
        await queryRunner.query(`DROP TYPE "public"."task_executions_periodicity_enum"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "endDate"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "startDate"`);
        await queryRunner.query(`ALTER TABLE "task_executions" DROP COLUMN "executionDate"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
    }

}
