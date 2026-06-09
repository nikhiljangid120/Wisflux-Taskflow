// src/comments/comments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { Task } from '../tasks/task-entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActivityType, ActivityEntityType } from '../activities/activity-type.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NOTIFICATIONS } from '../queues/queues.constants';
import { type CommentMentionPayload } from '../queues/job-payloads';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly activities: ActivitiesService,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Extracts UUIDs from @{uuid} mention patterns in a comment body.
   * Pattern: @  followed by a standard UUID v4 format.
   * Example body: "Hey @550e8400-e29b-41d4-a716-446655440000, take a look"
   */
  private extractMentionedUserIds(body: string): string[] {
    const uuidPattern =
      /\B@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;
    const matches = [...body.matchAll(uuidPattern)];
    // Deduplicate: same user mentioned twice still gets one notification
    return [...new Set(matches.map((m) => m[1]))];
  }

  async create(
    workspaceId: string,
    taskId: string,
    dto: CreateCommentDto,
    authorId: string,
  ): Promise<Comment> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    if (dto.parentCommentId) {
      const parent = await this.commentRepo.findOne({
        where: { id: dto.parentCommentId, taskId },
      });
      if (!parent) {
        throw new BadRequestException('Parent comment not found on this task');
      }
      // Disallow replies-to-replies: keep it one level deep
      if (parent.parentCommentId) {
        throw new BadRequestException('Cannot reply to a reply');
      }
    }

    const comment = this.commentRepo.create({
      taskId,
      authorId,
      body: dto.body,
      parentCommentId: dto.parentCommentId ?? null,
    });
    const saved = await this.commentRepo.save(comment);

    await this.activities.record({
      workspaceId,
      actorId: authorId,
      type: ActivityType.COMMENT_ADDED,
      entityType: ActivityEntityType.COMMENT,
      entityId: saved.id,
      payload: { taskId, parentCommentId: saved.parentCommentId },
    });

    const mentionedIds = this.extractMentionedUserIds(dto.body);

    for (const mentionedUserId of mentionedIds) {
      // Don't notify users who mentioned themselves
      if (mentionedUserId === authorId) continue;

      const payload: CommentMentionPayload = {
        commentId: saved.id,
        taskId: task.id,
        taskTitle: task.title,
        workspaceId: workspaceId,
        mentionedUserId,
        authorId,
        excerpt: dto.body.slice(0, 120),
      };

      await this.notificationsQueue.add('comment_mention', payload);
    }

    return saved;
  }

  async listForTask(taskId: string): Promise<Comment[]> {
    return this.commentRepo.find({
      where: { taskId },
      relations: {author: true},
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    taskId: string,
    id: string,
    dto: UpdateCommentDto,
    actorId: string,
  ): Promise<Comment> {
    const comment = await this.commentRepo.findOne({ where: { id, taskId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== actorId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }
    comment.body = dto.body;
    return this.commentRepo.save(comment);
  }

  async remove(taskId: string, id: string, actorId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id, taskId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== actorId) {
      throw new ForbiddenException('Only the author can delete this comment');
    }
    await this.commentRepo.remove(comment);
  }
}