import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  async findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: ['owner', 'project', 'executions', 'checkpoints'],
    });
  }

  async findOne(id: string): Promise<Task | null> {
    return this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'project', 'executions', 'checkpoints'],
    });
  }

  async findByOwner(ownerId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { owner: { id: ownerId } },
      relations: ['owner', 'project', 'executions', 'checkpoints'],
    });
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const owner = await this.usersRepository.findOne({ where: { id: dto.ownerId } });
    if (!owner) {
      throw new NotFoundException(`User with ID ${dto.ownerId} not found`);
    }

    let project: Project | null = null;
    if (dto.projectId) {
      project = await this.projectsRepository.findOne({ where: { id: dto.projectId } });
      if (!project) {
        throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
      }
    }

    const { ownerId, projectId, earliestStartAt, latestFinishAt, ...rest } = dto;

    const task = this.tasksRepository.create({
      ...rest,
      owner,
      project: project ?? undefined,
      earliestStartAt: earliestStartAt ? new Date(earliestStartAt) : undefined,
      latestFinishAt: latestFinishAt ? new Date(latestFinishAt) : undefined,
    });

    return this.tasksRepository.save(task);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task | null> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (dto.ownerId) {
      const owner = await this.usersRepository.findOne({ where: { id: dto.ownerId } });
      if (!owner) {
        throw new NotFoundException(`User with ID ${dto.ownerId} not found`);
      }
      task.owner = owner;
    }

    if (dto.projectId !== undefined) {
      if (dto.projectId) {
        const project = await this.projectsRepository.findOne({ where: { id: dto.projectId } });
        if (!project) {
          throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
        }
        task.project = project;
      } else {
        task.project = null as any;
      }
    }

    const { ownerId, projectId, earliestStartAt, latestFinishAt, ...rest } = dto;

    Object.assign(task, {
      ...rest,
      earliestStartAt: earliestStartAt ? new Date(earliestStartAt) : task.earliestStartAt,
      latestFinishAt: latestFinishAt ? new Date(latestFinishAt) : task.latestFinishAt,
    });

    return this.tasksRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    await this.tasksRepository.delete(id);
  }
}
