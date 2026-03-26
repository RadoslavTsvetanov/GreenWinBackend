import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: ['owner', 'executions', 'checkpoints'],
    });
  }

  async findOne(id: string): Promise<Task | null> {
    return this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'executions', 'checkpoints'],
    });
  }

  async findByOwner(ownerId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { owner: { id: ownerId } },
      relations: ['owner', 'executions', 'checkpoints'],
    });
  }

  async create(taskData: Partial<Task>): Promise<Task> {
    const task = this.tasksRepository.create(taskData);
    return this.tasksRepository.save(task);
  }

  async update(id: string, taskData: Partial<Task>): Promise<Task | null> {
    await this.tasksRepository.update(id, taskData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.tasksRepository.delete(id);
  }
}
