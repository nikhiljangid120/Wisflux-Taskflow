// src/comments/comments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { Task } from '../tasks/task-entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ActivitiesModule } from '../activities/activities.module';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Task]),
    WorkspacesModule,
    ActivitiesModule,
    QueuesModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}