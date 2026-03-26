import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckpointDto {
  @ApiProperty({ description: 'UUID of the task this checkpoint belongs to' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ required: false, description: 'UUID of the execution this checkpoint belongs to' })
  @IsOptional()
  @IsUUID()
  executionId?: string;

  @ApiProperty({ example: 's3://my-bucket/checkpoints/step-100' })
  @IsString()
  uri: string;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @IsInt()
  step?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @IsInt()
  epoch?: number;

  @ApiProperty({ required: false, type: Object, example: { loss: 0.42, accuracy: 0.91 } })
  @IsOptional()
  @IsObject()
  metrics?: Record<string, any>;
}
