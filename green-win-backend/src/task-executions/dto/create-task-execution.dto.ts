import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus } from '../enums/execution.enums';

export class CreateTaskExecutionDto {
  @ApiProperty({
    example: '7dd2fb0f-4b19-46fc-a7f8-79c3c7f549c6',
    description: 'Related task identifier',
  })
  taskId: string;

  @ApiProperty({
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
    description: 'Execution status lifecycle',
  })
  status?: ExecutionStatus;

  @ApiProperty({
    example: 'aws',
    description: 'Cloud provider used for execution',
    required: false,
  })
  provider?: string;

  @ApiProperty({
    example: 'eu-west-1',
    description: 'Region where execution runs',
    required: false,
  })
  region?: string;

  @ApiProperty({
    example: '2024-03-01T09:00:00Z',
    description: 'Scheduled start timestamp',
    required: false,
  })
  scheduledAt?: Date;

  @ApiProperty({
    example: '2024-03-01T09:05:00Z',
    description: 'Actual start timestamp',
    required: false,
  })
  startedAt?: Date;

  @ApiProperty({
    example: '2024-03-01T09:10:00Z',
    description: 'Completion timestamp',
    required: false,
  })
  finishedAt?: Date;

  @ApiProperty({
    example: { emissionsKg: 1.23, energyMix: { wind: 60, solar: 40 } },
    description: 'Execution metrics payload (JSON)',
    required: false,
    type: Object,
  })
  metrics?: Record<string, any>;

  @ApiProperty({
    example: 'Insufficient permissions to access resource',
    description: 'Error message when execution fails',
    required: false,
  })
  errorMessage?: string;

  @ApiProperty({
    example: 's3://greenwin/logs/execution-1234.log',
    description: 'Location of execution logs',
    required: false,
  })
  logsUri?: string;
}
