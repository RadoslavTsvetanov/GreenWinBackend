import { Controller, Post, Param, Body } from '@nestjs/common';
import { LambdaService } from '../lambda/lambda.service';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly lambdaService: LambdaService) {}

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
