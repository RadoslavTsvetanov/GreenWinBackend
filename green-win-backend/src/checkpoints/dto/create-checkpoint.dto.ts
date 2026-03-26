import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckpointDto {
  @ApiProperty({
    example: '2a6d7c5e-41a9-4de8-9014-cf8efbc9d4f0',
    description: 'Associated task identifier',
  })
  taskId: string;

  @ApiProperty({
    example: '3f5b4ac3-90a2-403d-b9f3-26b41df7a215',
    description: 'Associated execution identifier (nullable)',
    required: false,
  })
  executionId?: string | null;

  @ApiProperty({
    example: 's3://greenwin/checkpoints/task-123/latest.ckpt',
    description: 'Storage URI for the checkpoint payload',
  })
  uri: string;

  @ApiProperty({
    example: 1,
    description: 'Step number captured by the checkpoint',
    required: false,
  })
  step?: number;

  @ApiProperty({
    example: 5,
    description: 'Epoch number captured by the checkpoint',
    required: false,
  })
  epoch?: number;

  @ApiProperty({
    example: { accuracy: 0.94, loss: 0.12 },
    description: 'Arbitrary metrics saved with the checkpoint',
    required: false,
    type: Object,
  })
  metrics?: Record<string, any>;
}
