// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { ActivitiesModule } from './activities/activities.module';
import { QueuesModule } from './queues/queues.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    // isGlobal: true → ConfigService injectable everywhere without re-importing
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2_000, // 2s → 4s → 8s → 16s → 32s
          },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 250 },
        },
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    ActivitiesModule,
    QueuesModule,
    SchedulerModule,
    NotificationsModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}