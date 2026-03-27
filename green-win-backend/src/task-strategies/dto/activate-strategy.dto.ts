import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateStrategyDto {
  @ApiProperty({
    required: false,
    description:
      'Runtime parameter values for this invocation, validated against the task\'s parameterSchema. ' +
      'Required fields declared in the schema must be present.',
    example: { recipient: 'alice@example.com' },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
