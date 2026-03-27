import { MigrationInterface, QueryRunner } from "typeorm";

export class RenamedField1774571311841 implements MigrationInterface {
    name = 'RenamedField1774571311841'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "lambdaCode" TO "lambdaS3Key"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "lambdaS3Key" TO "lambdaCode"`);
    }

}
