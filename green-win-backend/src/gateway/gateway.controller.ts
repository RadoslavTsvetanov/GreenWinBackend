import { Controller, Post, Param, Body } from '@nestjs/common';
import { LambdaService } from '../lambda/lambda.service';
import { TasksService } from 'src/tasks';
import { TaskStrategiesService } from 'src/task-strategies/task-strategies.service';
import { TaskStrategy } from 'src/task-strategies/entities/task-strategy.entity';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly lambdaService: LambdaService,
    private readonly taskStrategiesService: TaskStrategiesService
  ) {}

  @Post(':organization/:project/:name')
  async invokeWorkload(
    @Param('organization') organization: string,
    @Param('name') name: string,
    @Param('project') project: string,
    @Body() payload?: Record<string, unknown>,
  ) {
    const functionName = `${organization}-${project}-${name}`;
    console.log({ organization, name, functionName });
    
    const result = await this.lambdaService.invokeGreenHandler(
      functionName,
      payload,
    );

    return result;
  }
}
