import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkpoint } from './entities/checkpoint.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskExecution } from '../task-executions/entities/task-execution.entity';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';

@Injectable()
export class CheckpointsService {
  constructor(
    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskExecution)
    private readonly executionsRepository: Repository<TaskExecution>,
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

  async create(dto: CreateCheckpointDto): Promise<Checkpoint> {
    const task = await this.tasksRepository.findOne({ where: { id: dto.taskId } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${dto.taskId} not found`);
    }

    let execution: TaskExecution | null = null;
    if (dto.executionId) {
      execution = await this.executionsRepository.findOne({ where: { id: dto.executionId } });
      if (!execution) {
        throw new NotFoundException(`TaskExecution with ID ${dto.executionId} not found`);
      }
    }

    const { taskId, executionId, ...rest } = dto;

    const checkpoint = this.checkpointsRepository.create({
      ...rest,
      task,
      execution,
    });

    return this.checkpointsRepository.save(checkpoint);
  }

  async update(id: string, dto: UpdateCheckpointDto): Promise<Checkpoint | null> {
    const checkpoint = await this.checkpointsRepository.findOne({ where: { id } });
    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with ID ${id} not found`);
    }

    if (dto.taskId) {
      const task = await this.tasksRepository.findOne({ where: { id: dto.taskId } });
      if (!task) {
        throw new NotFoundException(`Task with ID ${dto.taskId} not found`);
      }
      checkpoint.task = task;
    }

    if (dto.executionId !== undefined) {
      if (dto.executionId) {
        const execution = await this.executionsRepository.findOne({ where: { id: dto.executionId } });
        if (!execution) {
          throw new NotFoundException(`TaskExecution with ID ${dto.executionId} not found`);
        }
        checkpoint.execution = execution;
      } else {
        checkpoint.execution = null;
      }
    }

    const { taskId, executionId, ...rest } = dto;
    Object.assign(checkpoint, rest);

    return this.checkpointsRepository.save(checkpoint);
  }

  async remove(id: string): Promise<void> {
    await this.checkpointsRepository.delete(id);
  }
}
