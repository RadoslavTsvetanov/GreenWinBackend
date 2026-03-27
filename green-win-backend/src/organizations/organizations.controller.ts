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
import { TaskExecution, TaskExecutionsService } from 'src/task-executions';
import { CarbonService, LambdaExecutionMetrics } from 'src/carbon/carbon.service';

@ApiTags('organizations')
@ApiBearerAuth('access-token')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly tasksExecutionService: TaskExecutionsService,
    private readonly carbonService: CarbonService
  ) {}

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
  
  @Get(':organizationId/carbon-footprint/real')
  async getRealCarbonFootprint(
    @Param("organizationId") id: string
  ) {
    let totalEmissions = 0;
     (await this.tasksExecutionService.findAll()).forEach(taskExecution => {
      totalEmissions += taskExecution.metrics.estimatedEmissionsGco2
    })
     return totalEmissions
  }
  
  @Get(':organizationId/carbon-footprint/regional/:region')
  async estiamteFootprintForRegion(
    @Param("organizationId") id: string,
    @Param("region") region: string
  ) {
    let totalEmissions = 0;
    (await this.tasksExecutionService.findAll()).forEach(
      
      async taskExecution => {
        
        const carbonIndex = await this.carbonService.getCarbonIntensityFromDate(taskExecution.createdAt,region) 
        console.log("fofofof", carbonIndex, taskExecution.metrics, {"billedDurationMs": taskExecution.metrics.billedDurationMs, "memoryUsedMB": taskExecution.metrics.maxMemoryUsedMb})
        const lambdaFootprint = this.carbonService.calculateLambdaCarbonFootprint({"billedDurationMs": taskExecution.metrics.billedDurationMs, "memoryUsedMB": taskExecution.metrics.maxMemoryUsedMb}, carbonIndex)
        console.log("ddd", lambdaFootprint)
        totalEmissions += lambdaFootprint.carbonFootprintGCO2
      }
    )

    return totalEmissions
  }

  
}
