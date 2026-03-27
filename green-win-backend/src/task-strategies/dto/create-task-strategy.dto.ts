import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FiringStrategy } from '../enums/firing-strategy.enum';

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

  @ApiProperty({ enum: FiringStrategy })
  @IsEnum(FiringStrategy)
  type: FiringStrategy;

  @ApiProperty({ required: false, description: 'Required when type is CUSTOM' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiProperty({
    required: false,
    description:
      'Specific times of day (HH:mm UTC) for DAILY_AT_TIMES strategies.',
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
      'Time ranges for DAILY_IN_RANGE strategies. ML model picks the greenest moment in each range.',
    type: [TimeRangeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  timeRanges?: TimeRangeDto[];
}
