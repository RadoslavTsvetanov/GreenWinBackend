import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkpoint } from './entities/checkpoint.entity';

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

  async create(checkpointData: Partial<Checkpoint>): Promise<Checkpoint> {
    const checkpoint = this.checkpointsRepository.create(checkpointData);
    return this.checkpointsRepository.save(checkpoint);
  }

  async update(
    id: string,
    checkpointData: Partial<Checkpoint>,
  ): Promise<Checkpoint | null> {
    await this.checkpointsRepository.update(id, checkpointData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.checkpointsRepository.delete(id);
  }
}
