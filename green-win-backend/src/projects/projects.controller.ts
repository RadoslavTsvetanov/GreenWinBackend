import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  findAll(@Query('organizationId') organizationId?: string) {
    if (organizationId) {
      return this.projectsService.findByOrganization(organizationId);
    }
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Patch(':id/emissions')
  updateEmissions(
    @Param('id') id: string,
    @Body('emissionsAdded') emissionsAdded: number,
  ) {
    return this.projectsService.updateEmissions(id, emissionsAdded);
  }

  @Patch(':id/cost-savings')
  updateCostSavings(
    @Param('id') id: string,
    @Body('costSavings') costSavings: number,
  ) {
    return this.projectsService.updateCostSavings(id, costSavings);
  }

  @Patch(':id/energy-saved')
  updateEnergySaved(
    @Param('id') id: string,
    @Body('energySaved') energySaved: number,
  ) {
    return this.projectsService.updateEnergySaved(id, energySaved);
  }
}
