import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CheckpointsService } from './checkpoints.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { Checkpoint } from './entities/checkpoint.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('checkpoints')
@ApiBearerAuth('access-token')
@Controller('checkpoints')
@UseGuards(JwtAuthGuard)
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Get()
  findAll(): Promise<Checkpoint[]> {
    return this.checkpointsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Checkpoint | null> {
    return this.checkpointsService.findOne(id);
  }

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string): Promise<Checkpoint[]> {
    return this.checkpointsService.findByTask(taskId);
  }

  @Get('execution/:executionId')
  findByExecution(
    @Param('executionId') executionId: string,
  ): Promise<Checkpoint[]> {
    return this.checkpointsService.findByExecution(executionId);
  }

  @Post()
  create(@Body() dto: CreateCheckpointDto): Promise<Checkpoint> {
    return this.checkpointsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCheckpointDto,
  ): Promise<Checkpoint | null> {
    return this.checkpointsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.checkpointsService.remove(id);
  }
}
