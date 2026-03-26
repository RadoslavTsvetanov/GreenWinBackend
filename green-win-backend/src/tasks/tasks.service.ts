import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

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

  async create(taskData: CreateTaskDto): Promise<Task> {
    const { ownerId, ...rest } = taskData;

    const task = this.tasksRepository.create({
      ...rest,
      owner: { id: ownerId } as Task['owner'],
    });

    return this.tasksRepository.save(task);
  }

  async update(id: string, taskData: UpdateTaskDto): Promise<Task | null> {
    const { ownerId, ...rest } = taskData;

    const preloadData: Partial<Task> = {
      id,
      ...rest,
      ...(ownerId ? { owner: { id: ownerId } as Task['owner'] } : {}),
    };

    const task = await this.tasksRepository.preload(preloadData);
    if (!task) {
      return null;
    }

    return this.tasksRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    await this.tasksRepository.delete(id);
  }
}
