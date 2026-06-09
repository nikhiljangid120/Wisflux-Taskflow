import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { Workspace } from '../workspaces/workspace.entity';
import { WorkspaceMember } from '../workspaces/workspace-member.entity';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task-entity';
import { Activity } from '../activities/activity-entity';
import { Comment } from '../comments/comment.entity';
import { Notification } from '../notifications/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}', User, RefreshToken, Workspace, WorkspaceMember, Project, Task, Activity, Comment, Notification],
        synchronize: false,           // NEVER true in any environment with real data
        migrationsRun: false,         // we run migrations manually via CLI
        logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
  ],
})
export class DatabaseModule {}
