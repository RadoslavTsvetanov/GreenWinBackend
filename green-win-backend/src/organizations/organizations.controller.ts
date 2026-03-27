import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('organizations')
@ApiBearerAuth('access-token')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id/dashboard')
  @ApiOperation({
    summary: 'Get organization dashboard',
    description:
      'Returns comprehensive dashboard data: org info, project/task/execution/strategy counts, ' +
      'carbon & sustainability metrics, per-project summaries, and recent executions.',
  })
  getDashboard(@Param('id') id: string) {
    return this.organizationsService.getDashboard(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  @Patch(':id/emissions')
  updateEmissions(
    @Param('id') id: string,
    @Body('emissionsAdded') emissionsAdded: number,
  ) {
    return this.organizationsService.updateEmissions(id, emissionsAdded);
  }

  @Patch(':id/energy-saved')
  updateEnergySaved(
    @Param('id') id: string,
    @Body('energySaved') energySaved: number,
  ) {
    return this.organizationsService.updateEnergySaved(id, energySaved);
  }
}
