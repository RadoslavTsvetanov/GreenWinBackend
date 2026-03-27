import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TaskStrategiesService } from './task-strategies.service';
import { CreateTaskStrategyDto } from './dto/create-task-strategy.dto';
import { ActivateStrategyDto } from './dto/activate-strategy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('task-strategies')
@ApiBearerAuth('access-token')
@Controller('task-strategies')
@UseGuards(JwtAuthGuard)
export class TaskStrategiesController {
  constructor(private readonly strategiesService: TaskStrategiesService) {}

  @Get()
  @ApiOperation({ summary: 'List all strategies' })
  findAll() {
    return this.strategiesService.findAll();
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get all strategies for a task' })
  findByTask(@Param('taskId') taskId: string) {
    return this.strategiesService.findByTask(taskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single strategy by ID' })
  findOne(@Param('id') id: string) {
    return this.strategiesService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Add a strategy to a task',
    description: 'Creates the strategy in an inactive state. Use /activate to start it.',
  })
  create(@Body() dto: CreateTaskStrategyDto) {
    return this.strategiesService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a strategy (must be inactive first)' })
  remove(@Param('id') id: string) {
    return this.strategiesService.remove(id);
  }

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Activate a strategy',
    description:
      'For IMMEDIATELY strategies, fires the lambda once on the greenest server. ' +
      'For repeatable strategies (DAILY, WEEKLY, DAILY_AT_TIMES, DAILY_IN_RANGE, etc.), ' +
      'starts the cron schedule. Strategies can be stacked — activating one does not deactivate others.',
  })
  activate(@Param('id') id: string, @Body() dto: ActivateStrategyDto) {
    return this.strategiesService.activate(id, dto.parameters);
  }

  @Post(':id/deactivate')
  @ApiOperation({
    summary: 'Deactivate a repeatable strategy',
    description: 'Stops the cron schedule for this strategy. Does not affect other active strategies on the same task.',
  })
  deactivate(@Param('id') id: string) {
    return this.strategiesService.deactivate(id);
  }

  @Post(':id/invoke')
  @ApiOperation({
    summary: 'Manually invoke a strategy once',
    description:
      'Fires the lambda immediately regardless of schedule. ' +
      'Does not change the activation state. ' +
      'Call-time `parameters` are merged with the strategy\'s stored parameters.',
  })
  invoke(@Param('id') id: string, @Body() dto: ActivateStrategyDto) {
    return this.strategiesService.invoke(id, dto.parameters);
  }

}
