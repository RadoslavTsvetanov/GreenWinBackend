import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus } from '../enums/execution.enums';

export class CreateTaskExecutionDto {
  @ApiProperty({ description: 'UUID of the task to execute' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ enum: ExecutionStatus, default: ExecutionStatus.PENDING, required: false })
  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @ApiProperty({ required: false, example: 'aws' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false, example: 'eu-west-1' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false, description: 'When the execution was scheduled to run (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ required: false, description: 'Start of the time range evaluated (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  rangeStart?: string;

  @ApiProperty({ required: false, description: 'End of the time range evaluated (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  rangeEnd?: string;

  @ApiProperty({ required: false, description: 'Execution metrics (emissions, cost, etc.)' })
  @IsOptional()
  @IsObject()
  metrics?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
