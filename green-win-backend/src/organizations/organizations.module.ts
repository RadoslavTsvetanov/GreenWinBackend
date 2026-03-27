import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization } from './entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskExecution } from '../task-executions/entities/task-execution.entity';
import { TaskStrategy } from '../task-strategies/entities/task-strategy.entity';
import { TaskExecutionsModule } from '../task-executions/task-executions.module';
import { CarbonModule } from '../carbon/carbon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Project, Task, TaskExecution, TaskStrategy]),
    TaskExecutionsModule,
    CarbonModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
