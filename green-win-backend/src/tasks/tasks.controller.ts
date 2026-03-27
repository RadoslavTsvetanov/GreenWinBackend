import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List all tasks' })
  findAll() {
    return this.tasksService.findAll();
  }

  @Get('owner/:ownerId')
  @ApiOperation({ summary: 'Get tasks by owner ID' })
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.tasksService.findByOwner(ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID (includes strategies, executions)' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get the current status of a task' })
  getStatus(@Param('id') id: string) {
    return this.tasksService.getStatus(id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a task',
    description:
      'Multipart form: send task metadata as a JSON string in the `data` field ' +
      'and optionally the lambda zip as `lambdaZip`. ' +
      'No execution happens at creation — activate a strategy separately.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'string',
          description: 'JSON-serialised CreateTaskDto',
          example: '{"name":"Send Email","ownerId":"<uuid>"}',
        },
        lambdaZip: {
          type: 'string',
          format: 'binary',
          description: 'Lambda deployment package (.zip)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('lambdaZip'))
  create(
    @CurrentUser() user: User,
    @Body('data') rawData: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let dto: CreateTaskDto;
    try {
      dto = JSON.parse(rawData);
    } catch {
      throw new BadRequestException('`data` field must be valid JSON');
    }
    // Always use the authenticated user's ID, ignore whatever the DTO says
    dto.ownerId = user.id;
    return this.tasksService.create(dto, file?.buffer);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (stops any active strategy first)' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
