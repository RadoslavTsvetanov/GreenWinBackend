import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskExecution } from './entities/task-execution.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateTaskExecutionDto } from './dto/create-task-execution.dto';
import { UpdateTaskExecutionDto } from './dto/update-task-execution.dto';

@Injectable()
export class TaskExecutionsService {
  constructor(
    @InjectRepository(TaskExecution)
    private readonly executionsRepository: Repository<TaskExecution>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
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

  async create(dto: CreateTaskExecutionDto): Promise<TaskExecution> {
    const task = await this.tasksRepository.findOne({ where: { id: dto.taskId } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${dto.taskId} not found`);
    }

    const { taskId, scheduledAt, executionDate, startDate, endDate, ...rest } = dto;

    const execution = this.executionsRepository.create({
      ...rest,
      task,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      executionDate: executionDate ? new Date(executionDate) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return this.executionsRepository.save(execution);
  }

  async update(id: string, dto: UpdateTaskExecutionDto): Promise<TaskExecution | null> {
    const execution = await this.executionsRepository.findOne({ where: { id } });
    if (!execution) {
      throw new NotFoundException(`TaskExecution with ID ${id} not found`);
    }

    if (dto.taskId) {
      const task = await this.tasksRepository.findOne({ where: { id: dto.taskId } });
      if (!task) {
        throw new NotFoundException(`Task with ID ${dto.taskId} not found`);
      }
      execution.task = task;
    }

    const { taskId, scheduledAt, executionDate, startDate, endDate, ...rest } = dto;

    Object.assign(execution, {
      ...rest,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : execution.scheduledAt,
      executionDate: executionDate ? new Date(executionDate) : execution.executionDate,
      startDate: startDate ? new Date(startDate) : execution.startDate,
      endDate: endDate ? new Date(endDate) : execution.endDate,
    });

    return this.executionsRepository.save(execution);
  }

  async remove(id: string): Promise<void> {
    await this.executionsRepository.delete(id);
  }
}
