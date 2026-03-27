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
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskExecutionsService } from 'src/task-executions';

@Controller('organizations')
// @UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly taskExectionsService: TaskExecutionsService
  
  ) {}

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get('/carbon-footprint/real')
  async getCarbonUsage(
    @Query('startDate') startDate: Date,
    @Query('endDate', ) endDate: Date,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
  ){
    const transformedStart = new Date(startDate)
    const transformedEnd =  new Date(endDate)
    return await this.taskExectionsService.getLogsFromDateToDate(organizationId, transformedStart,transformedEnd)
  }

  @Get('carbon-fotprint/:region')
  async getCarbonUsageIfOnSpecificRegion(
    
    @Query('startDate') startDate: Date,
    @Query('endDate', ) endDate: Date,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
  ){
    const transformedStart = new Date(startDate)
    const transformedEnd =  new Date(endDate)
    const data = await this.taskExectionsService.getLogsFromDateToDate(organizationId, transformedStart ,transformedEnd)
    data.forEach(entry => entry.metrics)
  }

  @Get('/:projectId/carbon-footprint/real')
  getCarbonFootprintForCertainProject(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('projectId') projectId: string,
  ) {

  }
  
  @Get("/:projectId/carbon-footprint/:region")
  getCarbonFootprintForCertainProjectForCertainRegion(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('projectId') projectId: string,
  ){

  }


  @Get()
  findAll() {
    return this.organizationsService.findAll();
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
