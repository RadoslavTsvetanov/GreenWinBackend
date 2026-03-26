import { IsString, IsOptional, IsNumber, IsBoolean, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  organizationId: string;

  @IsNumber()
  @IsOptional()
  emissionsTarget?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
