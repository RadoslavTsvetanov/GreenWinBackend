import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskExecution } from '../task-executions/entities/task-execution.entity';
import { TaskStrategy } from '../task-strategies/entities/task-strategy.entity';
import { ExecutionStatus } from '../task-executions/enums/execution.enums';
import { TaskStatus } from '../tasks/enums/task.enums';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskExecution)
    private readonly executionRepository: Repository<TaskExecution>,
    @InjectRepository(TaskStrategy)
    private readonly strategyRepository: Repository<TaskStrategy>,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    const organization = this.organizationRepository.create(createOrganizationDto);
    const saved = await this.organizationRepository.save(organization);

    const mainProject = this.projectRepository.create({
      name: 'main',
      description: 'Default project',
      organization: saved,
    });
    await this.projectRepository.save(mainProject);

    return saved;
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: ['projects'],
    });
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['projects', 'projects.tasks'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async findByName(name: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { name } });
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);
    Object.assign(organization, updateOrganizationDto);
    return this.organizationRepository.save(organization);
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id);
    await this.organizationRepository.remove(organization);
  }

  async updateEmissions(id: string, emissionsAdded: number): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.currentMonthEmissions = Number(organization.currentMonthEmissions) + emissionsAdded;
    organization.totalEmissions = Number(organization.totalEmissions) + emissionsAdded;
    return this.organizationRepository.save(organization);
  }

  async incrementTasksExecuted(id: string): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.totalTasksExecuted += 1;
    return this.organizationRepository.save(organization);
  }

  async updateEnergySaved(id: string, energySaved: number): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.totalEnergySaved = Number(organization.totalEnergySaved) + energySaved;
    return this.organizationRepository.save(organization);
  }

  async getDashboard(id: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const projects = await this.projectRepository.find({
      where: { organization: { id } },
      relations: [
        'tasks',
        'tasks.owner',
        'tasks.strategies',
        'tasks.executions',
      ],
    });

    const allTasks = projects.flatMap((p) => p.tasks ?? []);
    const allExecutions = allTasks.flatMap((t) => t.executions ?? []);
    const allStrategies = allTasks.flatMap((t) => t.strategies ?? []);

    const tasksByStatus: Record<string, number> = {};
    for (const t of allTasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
    }

    const executionsByStatus: Record<string, number> = {};
    for (const e of allExecutions) {
      executionsByStatus[e.status] = (executionsByStatus[e.status] ?? 0) + 1;
    }

    const activeStrategies = allStrategies.filter((s) => s.isActive).length;

    const recentExecutions = [...allExecutions]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        status: e.status,
        provider: e.provider,
        region: e.region,
        scheduledAt: e.scheduledAt,
        metrics: e.metrics,
        createdAt: e.createdAt,
      }));

    const projectSummaries = projects.map((p) => {
      const tasks = p.tasks ?? [];
      const executions = tasks.flatMap((t) => t.executions ?? []);
      const strategies = tasks.flatMap((t) => t.strategies ?? []);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        isActive: p.isActive,
        taskCount: tasks.length,
        activeStrategies: strategies.filter((s) => s.isActive).length,
        executionCount: executions.length,
        successfulExecutions: executions.filter(
          (e) => e.status === ExecutionStatus.SUCCEEDED,
        ).length,
        failedExecutions: executions.filter(
          (e) => e.status === ExecutionStatus.FAILED,
        ).length,
        emissionsTarget: p.emissionsTarget,
        currentEmissions: p.currentEmissions,
        totalCostSavings: p.totalCostSavings,
        totalEnergySaved: p.totalEnergySaved,
        completedTasks: p.completedTasks,
        createdAt: p.createdAt,
      };
    });

    const monthlyEmissionsUsagePercent =
      organization.monthlyEmissionsTarget && organization.monthlyEmissionsTarget > 0
        ? Number(
            (
              (Number(organization.currentMonthEmissions) /
                Number(organization.monthlyEmissionsTarget)) *
              100
            ).toFixed(2),
          )
        : null;

    const annualEmissionsUsagePercent =
      organization.annualEmissionsTarget && organization.annualEmissionsTarget > 0
        ? Number(
            (
              (Number(organization.totalEmissions) /
                Number(organization.annualEmissionsTarget)) *
              100
            ).toFixed(2),
          )
        : null;

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        email: organization.email,
        contactPerson: organization.contactPerson,
        isActive: organization.isActive,
        preferredCloudProviders: organization.preferredCloudProviders,
        preferredRegions: organization.preferredRegions,
        createdAt: organization.createdAt,
      },
      counts: {
        projects: projects.length,
        activeProjects: projects.filter((p) => p.isActive).length,
        tasks: allTasks.length,
        tasksByStatus,
        executions: allExecutions.length,
        executionsByStatus,
        strategies: allStrategies.length,
        activeStrategies,
      },
      carbon: {
        monthlyEmissionsTarget: organization.monthlyEmissionsTarget,
        currentMonthEmissions: organization.currentMonthEmissions,
        monthlyEmissionsUsagePercent,
        annualEmissionsTarget: organization.annualEmissionsTarget,
        totalEmissions: organization.totalEmissions,
        annualEmissionsUsagePercent,
        totalEnergySaved: organization.totalEnergySaved,
        totalTasksExecuted: organization.totalTasksExecuted,
        emissionsMetadata: organization.emissionsMetadata,
      },
      projects: projectSummaries,
      recentExecutions,
    };
  }
}
