import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Periodicity } from '../enums/firing-strategy.enum';

export class TimeRangeDto {
  @ApiProperty({ example: '08:00', description: 'Start of range in HH:mm UTC' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  start: string;

  @ApiProperty({ example: '16:00', description: 'End of range in HH:mm UTC' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  end: string;
}

export class CreateTaskStrategyDto {
  @ApiProperty({ description: 'UUID of the task this strategy belongs to' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ enum: Periodicity })
  @IsEnum(Periodicity)
  periodicity: Periodicity;

  @ApiProperty({
    required: false,
    description: 'Specific times of day (HH:mm UTC) — only for DAILY.',
    example: ['09:00', '14:30'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{2}:\d{2}$/, { each: true })
  times?: string[];

  @ApiProperty({
    required: false,
    description:
      'Time ranges for ML-optimized scheduling. ' +
      'ONCE/WEEKLY/MONTHLY: single range. DAILY: multiple ranges.',
    type: [TimeRangeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  timeRanges?: TimeRangeDto[];

  @ApiProperty({
    required: false,
    description: 'Single exact time (HH:mm UTC) — for ONCE, WEEKLY, or MONTHLY.',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  executionTime?: string;

  @ApiProperty({
    required: false,
    description: 'Day of week (0=Sun, 1=Mon, ..., 6=Sat) — only for WEEKLY.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({
    required: false,
    description: 'Day of month (1-31) — only for MONTHLY.',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiProperty({
    required: false,
    description: 'Raw cron expression — overrides all other scheduling fields.',
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;
}
