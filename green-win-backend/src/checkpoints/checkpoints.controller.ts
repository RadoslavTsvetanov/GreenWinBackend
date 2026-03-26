import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CheckpointsService } from './checkpoints.service';
import { Checkpoint } from './entities/checkpoint.entity';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';

@ApiTags('checkpoints')
@Controller('checkpoints')
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @ApiOkResponse({ type: [Checkpoint], description: 'List all checkpoints' })
  @Get()
  findAll(): Promise<Checkpoint[]> {
    return this.checkpointsService.findAll();
  }

  @ApiOkResponse({ type: Checkpoint, description: 'Fetch checkpoint by ID' })
  @ApiResponse({ status: 404, description: 'Checkpoint not found' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Checkpoint | null> {
    return this.checkpointsService.findOne(id);
  }

  @ApiOkResponse({
    type: [Checkpoint],
    description: 'List checkpoints for a task',
  })
  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string): Promise<Checkpoint[]> {
    return this.checkpointsService.findByTask(taskId);
  }

  @ApiOkResponse({
    type: [Checkpoint],
    description: 'List checkpoints for an execution',
  })
  @Get('execution/:executionId')
  findByExecution(
    @Param('executionId') executionId: string,
  ): Promise<Checkpoint[]> {
    return this.checkpointsService.findByExecution(executionId);
  }

  @ApiCreatedResponse({ type: Checkpoint, description: 'Create a new checkpoint' })
  @ApiBody({ type: CreateCheckpointDto })
  @Post()
  create(@Body() checkpointData: CreateCheckpointDto): Promise<Checkpoint> {
    return this.checkpointsService.create(checkpointData);
  }

  @ApiOkResponse({ type: Checkpoint, description: 'Update an existing checkpoint' })
  @ApiResponse({ status: 404, description: 'Checkpoint not found' })
  @ApiBody({ type: UpdateCheckpointDto })
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() checkpointData: UpdateCheckpointDto,
  ): Promise<Checkpoint | null> {
    return this.checkpointsService.update(id, checkpointData);
  }

  @ApiResponse({ status: 204, description: 'Checkpoint deleted' })
  @ApiResponse({ status: 404, description: 'Checkpoint not found' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.checkpointsService.remove(id);
  }
}
