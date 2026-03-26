import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkpoint } from './entities/checkpoint.entity';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';

@Injectable()
export class CheckpointsService {
  constructor(
    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,
  ) {}

  async findAll(): Promise<Checkpoint[]> {
    return this.checkpointsRepository.find({
      relations: ['task', 'execution'],
    });
  }

  async findOne(id: string): Promise<Checkpoint | null> {
    return this.checkpointsRepository.findOne({
      where: { id },
      relations: ['task', 'execution'],
    });
  }

  async findByTask(taskId: string): Promise<Checkpoint[]> {
    return this.checkpointsRepository.find({
      where: { task: { id: taskId } },
      relations: ['task', 'execution'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByExecution(executionId: string): Promise<Checkpoint[]> {
    return this.checkpointsRepository.find({
      where: { execution: { id: executionId } },
      relations: ['task', 'execution'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(checkpointData: CreateCheckpointDto): Promise<Checkpoint> {
    const { taskId, executionId, ...rest } = checkpointData;

    const checkpoint = this.checkpointsRepository.create({
      ...rest,
      task: { id: taskId } as Checkpoint['task'],
      execution: executionId
        ? ({ id: executionId } as Checkpoint['execution'])
        : null,
    });

    return this.checkpointsRepository.save(checkpoint);
  }

  async update(
    id: string,
    checkpointData: UpdateCheckpointDto,
  ): Promise<Checkpoint | null> {
    const { taskId, executionId, ...rest } = checkpointData;

    const preloadData: Partial<Checkpoint> = {
      id,
      ...rest,
      ...(taskId ? { task: { id: taskId } as Checkpoint['task'] } : {}),
      ...(executionId !== undefined
        ? { execution: executionId ? ({ id: executionId } as Checkpoint['execution']) : null }
        : {}),
    };

    const checkpoint = await this.checkpointsRepository.preload(preloadData);
    if (!checkpoint) {
      return null;
    }

    return this.checkpointsRepository.save(checkpoint);
  }

  async remove(id: string): Promise<void> {
    await this.checkpointsRepository.delete(id);
  }
}
