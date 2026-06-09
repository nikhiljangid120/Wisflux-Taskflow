// src/projects/projects.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), WorkspacesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}