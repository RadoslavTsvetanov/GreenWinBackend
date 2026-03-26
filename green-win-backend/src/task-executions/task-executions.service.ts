import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskExecution } from './entities/task-execution.entity';
import { CreateTaskExecutionDto } from './dto/create-task-execution.dto';
import { UpdateTaskExecutionDto } from './dto/update-task-execution.dto';

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

  async create(
    executionData: CreateTaskExecutionDto,
  ): Promise<TaskExecution> {
    const { taskId, ...rest } = executionData;

    const execution = this.executionsRepository.create({
      ...rest,
      task: { id: taskId } as TaskExecution['task'],
    });

    return this.executionsRepository.save(execution);
  }

  async update(
    id: string,
    executionData: UpdateTaskExecutionDto,
  ): Promise<TaskExecution | null> {
    const { taskId, ...rest } = executionData;

    const preloadData: Partial<TaskExecution> = {
      id,
      ...rest,
      ...(taskId ? { task: { id: taskId } as TaskExecution['task'] } : {}),
    };

    const execution = await this.executionsRepository.preload(preloadData);
    if (!execution) {
      return null;
    }

    return this.executionsRepository.save(execution);
  }

  async remove(id: string): Promise<void> {
    await this.executionsRepository.delete(id);
  }
}
