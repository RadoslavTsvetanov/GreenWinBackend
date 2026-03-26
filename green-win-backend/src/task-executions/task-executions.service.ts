import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskExecution } from './entities/task-execution.entity';

@Injectable()
export class TaskExecutionsService {
  constructor(
    @InjectRepository(TaskExecution)
    private readonly executionsRepository: Repository<TaskExecution>,
  ) {}

  async findAll(): Promise<TaskExecution[]> {
    return this.executionsRepository.find({
      relations: ['task', 'checkpoints'],
    });
  }

  async findOne(id: string): Promise<TaskExecution | null> {
    return this.executionsRepository.findOne({
      where: { id },
      relations: ['task', 'checkpoints'],
    });
  }

  async findByTask(taskId: string): Promise<TaskExecution[]> {
    return this.executionsRepository.find({
      where: { task: { id: taskId } },
      relations: ['task', 'checkpoints'],
    });
  }

  async create(executionData: Partial<TaskExecution>): Promise<TaskExecution> {
    const execution = this.executionsRepository.create(executionData);
    return this.executionsRepository.save(execution);
  }

  async update(
    id: string,
    executionData: Partial<TaskExecution>,
  ): Promise<TaskExecution | null> {
    await this.executionsRepository.update(id, executionData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.executionsRepository.delete(id);
  }
}
