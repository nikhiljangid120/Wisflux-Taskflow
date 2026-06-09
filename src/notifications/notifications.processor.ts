// src/notifications/notifications.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NOTIFICATIONS } from '../queues/queues.constants';
import { NotificationsService } from './notifications.service';
import {
  type NotificationJobName,
  type TaskAssignedPayload,
  type DueReminderPayload,
  type CommentMentionPayload,
  type StatusChangedPayload,
} from '../queues/job-payloads';
import { TaskflowGateway } from 'src/gateway/taskflow.gateway';

/** Extract the recipient userId from whichever payload type we receive. */
function recipientUserId(
  name: NotificationJobName,
  data:
    | TaskAssignedPayload
    | DueReminderPayload
    | CommentMentionPayload
    | StatusChangedPayload,
): string | null {
  switch (name) {
    case 'task_assigned':
      return (data as TaskAssignedPayload).assigneeId;
    case 'due_reminder':
      return (data as DueReminderPayload).assigneeId;
    case 'comment_mention':
      return (data as CommentMentionPayload).mentionedUserId;
    case 'status_changed':
      return (data as StatusChangedPayload).assigneeId;
    default:
      return null;
  }
}

@Processor(QUEUE_NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly gateway: TaskflowGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const name = job.name as NotificationJobName;
    const data = job.data as
      | TaskAssignedPayload
      | DueReminderPayload
      | CommentMentionPayload
      | StatusChangedPayload;

    const userId = recipientUserId(name, data);

    if (!userId) {
      this.logger.warn(
        `Job "${name}" (id=${job.id}) has no recipient userId — skipping`,
      );
      return;
    }

    const notification = await this.notificationsService.create({
      userId,
      type: name,
      payload: data as unknown as Record<string, unknown>,
    });

    this.logger.log(
      `Notification persisted: type=${notification.type} userId=${userId} id=${notification.id}`,
    );

    this.gateway.emitToUser(userId, 'notification', notification);
  }
}
