import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskStrategy } from '../task-strategies/entities/task-strategy.entity';
import { TaskStatus } from './enums/task.enums';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SchedulerService } from '../scheduler/scheduler.service';
import { FiringStrategy } from '../task-strategies/enums/firing-strategy.enum';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(TaskStrategy)
    private readonly strategyRepository: Repository<TaskStrategy>,
    private readonly schedulerService: SchedulerService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: ['owner', 'project', 'project.organization', 'strategies', 'executions', 'checkpoints'],
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'project', 'project.organization', 'strategies', 'executions', 'checkpoints'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async findByOwner(ownerId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { owner: { id: ownerId } },
      relations: ['owner', 'project', 'strategies', 'executions', 'checkpoints'],
    });
  }

  async getStatus(id: string): Promise<{ id: string; status: TaskStatus; isEnabled: boolean }> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return { id: task.id, status: task.status, isEnabled: task.isEnabled };
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const owner = await this.usersRepository.findOne({ where: { id: dto.ownerId } });
    if (!owner) throw new NotFoundException(`User ${dto.ownerId} not found`);

    let project: Project | undefined;
    if (dto.projectId) {
      const found = await this.projectsRepository.findOne({
        where: { id: dto.projectId },
        relations: ['organization'],
      });
      if (!found) throw new NotFoundException(`Project ${dto.projectId} not found`);
      project = found;
    }

    const { ownerId, projectId, earliestStartAt, latestFinishAt, strategies, ...rest } = dto;

    const task = this.tasksRepository.create({
      ...rest,
      owner,
      project,
      earliestStartAt: earliestStartAt ? new Date(earliestStartAt) : undefined,
      latestFinishAt: latestFinishAt ? new Date(latestFinishAt) : undefined,
    });

    const saved = await this.tasksRepository.save(task);

    // Pre-attach any strategies requested at creation time (all inactive)
    if (strategies?.length) {
      const strategyEntities = strategies.map((s) => {
        if (s.type === FiringStrategy.CUSTOM && !s.cronExpression) {
          throw new BadRequestException('cronExpression is required for CUSTOM strategies');
        }
        return this.strategyRepository.create({
          task: saved,
          type: s.type,
          cronExpression: s.cronExpression,
        });
      });
      saved.strategies = await this.strategyRepository.save(strategyEntities);
    }

    return saved;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    if (dto.ownerId) {
      const owner = await this.usersRepository.findOne({ where: { id: dto.ownerId } });
      if (!owner) throw new NotFoundException(`User ${dto.ownerId} not found`);
      task.owner = owner;
    }

    if (dto.projectId !== undefined) {
      if (dto.projectId) {
        const project = await this.projectsRepository.findOne({ where: { id: dto.projectId } });
        if (!project) throw new NotFoundException(`Project ${dto.projectId} not found`);
        task.project = project;
      } else {
        task.project = null as any;
      }
    }

    const { ownerId, projectId, earliestStartAt, latestFinishAt, strategies, ...rest } = dto as any;

    Object.assign(task, {
      ...rest,
      earliestStartAt: earliestStartAt ? new Date(earliestStartAt) : task.earliestStartAt,
      latestFinishAt: latestFinishAt ? new Date(latestFinishAt) : task.latestFinishAt,
    });

    return this.tasksRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['strategies'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    // Stop all active cron jobs before deleting (each keyed by strategy.id)
    for (const s of task.strategies ?? []) {
      if (s.isActive) {
        this.schedulerService.removeCronJob(s.id);
      }
    }

    await this.tasksRepository.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Enable / disable
  // ---------------------------------------------------------------------------

  async enable(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.isEnabled) throw new BadRequestException('Task is already enabled');

    task.isEnabled = true;
    return this.tasksRepository.save(task);
  }

  async disable(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['strategies'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (!task.isEnabled) throw new BadRequestException('Task is already disabled');

    // Stop each active strategy's cron (keyed by strategy.id) and mark inactive
    const active = task.strategies?.filter((s) => s.isActive) ?? [];
    for (const s of active) {
      this.schedulerService.removeCronJob(s.id);
      s.isActive = false;
    }
    if (active.length) {
      await this.strategyRepository.save(active);
    }

    task.isEnabled = false;
    task.status = TaskStatus.DRAFT;
    return this.tasksRepository.save(task);
  }
}
