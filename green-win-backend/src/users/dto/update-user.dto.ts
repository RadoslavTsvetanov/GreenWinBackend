import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: [String], required: false, example: ['aws', 'gcp'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultCloudProviders?: string[];

  @ApiProperty({ type: [String], required: false, example: ['eu-west-1', 'us-east-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultRegions?: string[];

  @ApiProperty({ required: false, description: 'UUID of the organization to link the user to' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
