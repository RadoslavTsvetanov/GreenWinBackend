import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus, TaskPeriodicity } from '../enums/execution.enums';

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

  @ApiProperty({ required: false, description: 'ISO 8601 datetime' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ required: false, description: 'ISO 8601 datetime' })
  @IsOptional()
  @IsDateString()
  executionDate?: string;

  @ApiProperty({ required: false, description: 'Start of execution window, ISO 8601' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End of execution window, ISO 8601' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: TaskPeriodicity, default: TaskPeriodicity.ONCE, required: false })
  @IsOptional()
  @IsEnum(TaskPeriodicity)
  periodicity?: TaskPeriodicity;

  @ApiProperty({
    required: false,
    type: 'array',
    items: { type: 'object' },
    description: 'Array of execution windows',
  })
  @IsOptional()
  @IsArray()
  executionWindows?: Array<{
    startDate?: string;
    endDate?: string;
    executeAsap?: boolean;
    priority?: number;
  }>;
}
