// src/projects/projects.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateProjectDto,
    createdById: string,
  ): Promise<Project> {
    const project = this.projectRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description ?? null,
      createdById,
    });
    return this.projectRepo.save(project);
  }

  async listInWorkspace(workspaceId: string): Promise<Project[]> {
    return this.projectRepo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(workspaceId: string, id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id, workspaceId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findById(workspaceId, id);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const project = await this.findById(workspaceId, id);
    await this.projectRepo.remove(project);
  }
}