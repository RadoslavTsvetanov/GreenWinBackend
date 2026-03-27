import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsDateString,
  IsUUID,
  IsBoolean,
  Matches,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskCodeType } from '../enums/task.enums';
import { Periodicity } from '../../task-strategies/enums/firing-strategy.enum';
import { TimeRangeDto } from '../../task-strategies/dto/create-task-strategy.dto';

class ParameterSchemaItemDto {
  @ApiProperty({ example: 'recipient' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'object'], example: 'string' })
  @IsEnum(['string', 'number', 'boolean', 'object'])
  type: 'string' | 'number' | 'boolean' | 'object';

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ required: false, description: 'Default value if not supplied at activation' })
  @IsOptional()
  default?: any;

  @ApiProperty({ required: false, example: 'Email address of the recipient' })
  @IsOptional()
  @IsString()
  description?: string;
}

class StrategyInputDto {
  @ApiProperty({ enum: Periodicity })
  @IsEnum(Periodicity)
  periodicity: Periodicity;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{2}:\d{2}$/, { each: true })
  times?: string[];

  @ApiProperty({ required: false, type: [TimeRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  timeRanges?: TimeRangeDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  executionTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiProperty({ required: false, description: 'Raw cron override' })
  @IsOptional()
  @IsString()
  cronExpression?: string;
}

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

  @ApiProperty({ description: 'UUID of the owner user' })
  @IsOptional()
  @IsUUID()
  ownerId: string;

  @ApiProperty({ required: false, description: 'UUID of the project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    required: false,
    type: [StrategyInputDto],
    description: 'Firing strategies to pre-attach to the task (none are active by default)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyInputDto)
  strategies?: StrategyInputDto[];

  @ApiProperty({
    required: false,
    type: [ParameterSchemaItemDto],
    description:
      'Declares the parameters this lambda accepts. ' +
      'The frontend reads this to render a dynamic form before activating a strategy.',
    example: [{ name: 'recipient', type: 'string', required: true, description: 'Recipient email' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParameterSchemaItemDto)
  parameterSchema?: ParameterSchemaItemDto[];
}
