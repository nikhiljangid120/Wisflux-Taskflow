// src/workspaces/workspaces.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './workspace.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { User } from '../users/user.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, WorkspaceMember, User])],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}