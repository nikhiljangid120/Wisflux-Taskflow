// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task-entity';
import { Project } from '../projects/project.entity';
import { WorkspaceMember } from '../workspaces/workspace-member.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ActivitiesModule } from 'src/activities/activities.module';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, WorkspaceMember]),
    WorkspacesModule, ActivitiesModule, QueuesModule
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}