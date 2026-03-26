import { ApiProperty } from '@nestjs/swagger';
import { TaskCodeType, TaskRunMode, TaskStatus } from '../enums/task.enums';

export class CreateTaskDto {
  @ApiProperty({ example: 'Green Task', description: 'Task name' })
  name: string;

  @ApiProperty({
    example: 'Process data in the greenest region',
    description: 'Detailed task description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    enum: TaskCodeType,
    default: TaskCodeType.LAMBDA,
    description: 'Code deployment type',
  })
  codeType: TaskCodeType;

  @ApiProperty({
    example: 'exports.handler = async () => ({ statusCode: 200 });',
    description: 'Lambda code snippet',
    required: false,
  })
  lambdaCode?: string;

  @ApiProperty({
    example: 'ghcr.io/greenwin/my-task:latest',
    description: 'Docker image reference',
    required: false,
  })
  dockerImage?: string;

  @ApiProperty({
    example: ['aws', 'gcp'],
    description: 'Allowed cloud providers for execution',
    required: false,
    type: [String],
  })
  allowedCloudProviders?: string[];

  @ApiProperty({
    example: ['eu-west-1', 'us-east-1'],
    description: 'Allowed regions for execution',
    required: false,
    type: [String],
  })
  allowedRegions?: string[];

  @ApiProperty({
    enum: TaskRunMode,
    default: TaskRunMode.IMMEDIATE,
    description: 'Scheduling mode',
  })
  runMode: TaskRunMode;

  @ApiProperty({
    enum: TaskStatus,
    default: TaskStatus.DRAFT,
    description: 'Initial task status',
  })
  status: TaskStatus;

  @ApiProperty({
    example: '2024-03-01T08:00:00Z',
    description: 'Earliest allowed start time',
    required: false,
  })
  earliestStartAt?: Date;

  @ApiProperty({
    example: '2024-03-01T12:00:00Z',
    description: 'Latest allowed finish time',
    required: false,
  })
  latestFinishAt?: Date;

  @ApiProperty({
    example: 'a3bd5e4b-6164-4dfb-9740-8665c4d3ae57',
    description: 'Owner user ID',
  })
  ownerId: string;
}
