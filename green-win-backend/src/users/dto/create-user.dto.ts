import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@greenwin.dev',
    description: 'User email address (unique)',
  })
  email: string;

  @ApiProperty({
    example: 'hashed_password_123',
    description: 'Hashed password',
  })
  passwordHash: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: ['aws', 'gcp', 'azure'],
    description: 'Default cloud providers for tasks',
    required: false,
    type: [String],
  })
  defaultCloudProviders?: string[];

  @ApiProperty({
    example: ['eu-west-1', 'us-east-1'],
    description: 'Default regions for task execution',
    required: false,
    type: [String],
  })
  defaultRegions?: string[];
}
