import { IsString, IsEmail, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  monthlyEmissionsTarget?: number;

  @IsNumber()
  @IsOptional()
  annualEmissionsTarget?: number;

  @IsArray()
  @IsOptional()
  preferredCloudProviders?: string[];

  @IsArray()
  @IsOptional()
  preferredRegions?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
