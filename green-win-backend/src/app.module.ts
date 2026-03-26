import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { TaskExecutionsModule } from './task-executions/task-executions.module';
import { CheckpointsModule } from './checkpoints/checkpoints.module';
import { GatewayModule } from './gateway/gateway.module';
import { CarbonModule } from './carbon/carbon.module';
import { LambdaModule } from './lambda/lambda.module';
import { AwsModule } from './aws/aws.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PredictionModule } from './prediction/prediction.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { TaskStrategiesModule } from './task-strategies/task-strategies.module';
// Explicit entity list — ensures all entities are in the DataSource regardless
// of autoLoadEntities timing with circular-imported entities.
import { User } from './users/entities/user.entity';
import { Organization } from './organizations/entities/organization.entity';
import { Project } from './projects/entities/project.entity';
import { Task } from './tasks/entities/task.entity';
import { TaskStrategy } from './task-strategies/entities/task-strategy.entity';
import { TaskExecution } from './task-executions/entities/task-execution.entity';
import { Checkpoint } from './checkpoints/entities/checkpoint.entity';

const ALL_ENTITIES = [User, Organization, Project, Task, TaskStrategy, TaskExecution, Checkpoint];

const buildTypeOrmOptions = (config: ConfigService): TypeOrmModuleOptions => {
  const sslEnabled = config.get<string>('DB_SSL', 'false') === 'true';

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
    username: config.get<string>('DB_USER', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'greenwin'),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    entities: ALL_ENTITIES,
    synchronize: false,
    logging: false,
  };
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    TasksModule,
    TaskStrategiesModule,
    TaskExecutionsModule,
    CheckpointsModule,
    GatewayModule,
    CarbonModule,
    LambdaModule,
    AwsModule,
    SchedulerModule,
    PredictionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
