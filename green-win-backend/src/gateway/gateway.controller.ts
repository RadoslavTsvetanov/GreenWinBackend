import { Controller, Post, Param, Body } from '@nestjs/common';
import { LambdaService } from '../lambda/lambda.service';
import { ExecutionStatus, TaskExecutionsService } from 'src/task-executions';
import { TasksService } from 'src/tasks';

@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly lambdaService: LambdaService,
    private readonly taskExecutionService: TaskExecutionsService,
    private readonly tasksRepository: TasksService
  ) {}

  @Post(':organization/:project/:name')
  async invokeWorkload(
    @Param('organization') organization: string,
    @Param('name') name: string,
    @Param('project') project: string,
    @Body() payload?: Record<string, unknown>,
  ) {
    const functionName = `${organization}-${project}-${name.replaceAll(" ","-")}`;
    console.log({ organization, name, functionName });

    const task = await this.tasksRepository.findByName(name)!
    console.log(task)



    const startDate = new Date().toString()

    const result = await this.lambdaService.invokeGreenHandler(
      functionName,
      payload,
    );
    


    this.taskExecutionService.create({
      taskId: task!.id,
      endDate: new Date().toString(),
      startDate,
      status: ExecutionStatus.SUCCEEDED,
    })

    return result;
  }
}
