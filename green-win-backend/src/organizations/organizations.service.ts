import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
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
    organization.currentMonthEmissions += emissionsAdded;
    organization.totalEmissions += emissionsAdded;
    return this.organizationRepository.save(organization);
  }

  async incrementTasksExecuted(id: string): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.totalTasksExecuted += 1;
    return this.organizationRepository.save(organization);
  }

  async updateEnergySaved(id: string, energySaved: number): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.totalEnergySaved += energySaved;
    return this.organizationRepository.save(organization);
  }
}
