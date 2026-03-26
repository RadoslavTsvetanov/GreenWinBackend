import { PartialType } from '@nestjs/swagger';
import { CreateTaskExecutionDto } from './create-task-execution.dto';

export class UpdateTaskExecutionDto extends PartialType(CreateTaskExecutionDto) {}
