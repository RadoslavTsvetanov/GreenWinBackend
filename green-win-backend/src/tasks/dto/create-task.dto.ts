import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskCodeType, TaskRunMode } from '../enums/task.enums';

export class CreateTaskDto {
  @ApiProperty({ example: 'Train Model' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: 'Nightly model training job' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskCodeType, default: TaskCodeType.LAMBDA })
  @IsOptional()
  @IsEnum(TaskCodeType)
  codeType?: TaskCodeType;

  @ApiProperty({ required: false, description: 'Inline Lambda handler code' })
  @IsOptional()
  @IsString()
  lambdaCode?: string;

  @ApiProperty({ required: false, example: 'my-org/my-image:latest' })
  @IsOptional()
  @IsString()
  dockerImage?: string;

  @ApiProperty({ type: [String], required: false, example: ['aws', 'gcp'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCloudProviders?: string[];

  @ApiProperty({ type: [String], required: false, example: ['eu-west-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRegions?: string[];

  @ApiProperty({ enum: TaskRunMode, default: TaskRunMode.IMMEDIATE })
  @IsOptional()
  @IsEnum(TaskRunMode)
  runMode?: TaskRunMode;

  @ApiProperty({
    required: false,
    example: '0 3 * * 1',
    description:
      'Cron expression for recurring scheduled tasks (SCHEDULED mode only). ' +
      'When set the task repeats on this schedule. ' +
      'When absent the task runs once at the optimal time within the start/finish window.',
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiProperty({ required: false, description: 'ISO 8601 datetime' })
  @IsOptional()
  @IsDateString()
  earliestStartAt?: string;

  @ApiProperty({ required: false, description: 'ISO 8601 datetime' })
  @IsOptional()
  @IsDateString()
  latestFinishAt?: string;

  @ApiProperty({ description: 'UUID of the owner user' })
  @IsUUID()
  ownerId: string;

  @ApiProperty({ required: false, description: 'UUID of the project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
