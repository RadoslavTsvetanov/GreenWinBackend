import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization } from './entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskExecutionsModule } from '../task-executions/task-executions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Project]),
    TaskExecutionsModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
