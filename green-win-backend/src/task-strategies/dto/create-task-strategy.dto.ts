import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FiringStrategy } from '../enums/firing-strategy.enum';

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
}
