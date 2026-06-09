// src/projects/projects.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.create(workspaceId, dto, user.id);
  }

  @Get()
  list(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.projectsService.listInWorkspace(workspaceId);
  }

  @Get(':id')
  findOne(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findById(workspaceId, id);
  }

  @Patch(':id')
  update(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.remove(workspaceId, id);
  }
}
