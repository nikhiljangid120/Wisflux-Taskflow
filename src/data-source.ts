// src/data-source.ts — for TypeORM CLI only
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { User } from './users/user.entity';
import { RefreshToken } from './auth/refresh-token.entity';
import { Workspace } from './workspaces/workspace.entity';
import { WorkspaceMember } from './workspaces/workspace-member.entity';
import { Project } from './projects/project.entity';
import { Task } from './tasks/task-entity';
import { Comment } from './comments/comment.entity';
import { Activity } from './activities/activity-entity';

loadEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User,RefreshToken,Workspace,WorkspaceMember,Project, Task, Comment, Activity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});