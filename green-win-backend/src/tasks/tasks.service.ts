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
import { Periodicity } from '../task-strategies/enums/firing-strategy.enum';
import { AwsDeployService } from '../aws/aws-deploy.service';
import { EUROPE_AWS_REGION_COUNTRY } from '../carbon/constants/aws-regions';

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
    private readonly awsDeployService: AwsDeployService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: ['owner', 'project', 'project.organization', 'strategies', 'executions'],
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'project', 'project.organization', 'strategies', 'executions'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async findByOwner(ownerId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { owner: { id: ownerId } },
      relations: ['owner', 'project', 'strategies', 'executions'],
    });
  }

  async getStatus(id: string): Promise<{ id: string; status: TaskStatus; }> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return { id: task.id, status: task.status };
  }

  async create(dto: CreateTaskDto, lambdaZip?: Buffer): Promise<Task> {
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

    const { ownerId, projectId, strategies, ...rest } = dto;
    const res = await this.awsDeployService.deployToMultipleRegions({
      workloadName: rest.name.replace(/[^a-zA-Z0-9-]/g, '-'),
      zipBuffer: lambdaZip!,
      organization: owner.id,
      roleArn: "arn:aws:iam::982479883166:role/our-backend-to-create-lambdas",
      regions: [ 'us-east-1'],
      projectId: projectId!
    })

    console.log('Deployment result:', res);

    // Save task first to get its ID for the S3 key
    const task = this.tasksRepository.create({
      ...rest,
      owner,
      project,
    });

    const saved = await this.tasksRepository.save(task);

    // Pre-attach any strategies requested at creation time (all inactive)
    if (strategies?.length) {
      const strategyEntities = strategies.map((s) => {
        return this.strategyRepository.create({
          task: saved,
          periodicity: s.periodicity,
          times: s.times,
          timeRanges: s.timeRanges,
          executionTime: s.executionTime,
          dayOfWeek: s.dayOfWeek,
          dayOfMonth: s.dayOfMonth,
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

    const { ownerId, projectId, strategies, ...rest } = dto as any;

    Object.assign(task, rest);

    return this.tasksRepository.save(task);
  }

  async getTaskDetail(id: string) {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'project', 'project.organization', 'strategies', 'executions'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    const executions = task.executions ?? [];
    const strategies = task.strategies ?? [];

    // Sort executions newest first
    const sorted = [...executions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sorted[0] ?? null;

    // Aggregate CO2 from all executions
    const totalCo2Grams = executions.reduce(
      (sum, e) => sum + (e.metrics?.estimatedEmissionsGco2 ?? 0),
      0,
    );
    const totalEnergyKwh = executions.reduce(
      (sum, e) => sum + (e.metrics?.estimatedEnergyKwh ?? 0),
      0,
    );

    // Derive execution mode from strategies
    const activeStrategy = strategies.find((s) => s.isActive) ?? strategies[0];
    const executionMode = activeStrategy?.periodicity ?? null;

    return {
      ...task,
      summary: {
        provider: latest?.provider ?? null,
        region: latest?.region ?? null,
        totalCo2Grams: Number(totalCo2Grams.toFixed(6)),
        totalEnergyKwh: Number(totalEnergyKwh.toFixed(10)),
        executionMode,
        totalExecutions: executions.length,
        successfulExecutions: executions.filter((e) => e.status === 'succeeded').length,
        failedExecutions: executions.filter((e) => e.status === 'failed').length,
        lastExecutedAt: latest?.finishedAt ?? latest?.createdAt ?? null,
        lastRegion: latest?.region ?? null,
      },
    };
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

  
}
