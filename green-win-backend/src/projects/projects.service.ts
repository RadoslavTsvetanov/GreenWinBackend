import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const { organizationId, ...projectData } = createProjectDto;

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const project = this.projectRepository.create({
      ...projectData,
      organization,
    });

    return this.projectRepository.save(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      relations: ['organization', 'tasks'],
    });
  }

  async findByOrganization(organizationId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { organization: { id: organizationId } },
      relations: ['tasks'],
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['organization', 'tasks'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    if (updateProjectDto.organizationId) {
      const organization = await this.organizationRepository.findOne({
        where: { id: updateProjectDto.organizationId },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${updateProjectDto.organizationId} not found`,
        );
      }

      project.organization = organization;
      delete updateProjectDto.organizationId;
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
  }

  async updateEmissions(id: string, emissionsAdded: number): Promise<Project> {
    const project = await this.findOne(id);
    project.currentEmissions += emissionsAdded;
    return this.projectRepository.save(project);
  }

  async incrementCompletedTasks(id: string): Promise<Project> {
    const project = await this.findOne(id);
    project.completedTasks += 1;
    return this.projectRepository.save(project);
  }

  async updateCostSavings(id: string, costSavings: number): Promise<Project> {
    const project = await this.findOne(id);
    project.totalCostSavings += costSavings;
    return this.projectRepository.save(project);
  }

  async updateEnergySaved(id: string, energySaved: number): Promise<Project> {
    const project = await this.findOne(id);
    project.totalEnergySaved += energySaved;
    return this.projectRepository.save(project);
  }
}
