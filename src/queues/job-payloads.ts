// src/queues/job-payloads.ts

/** Emitted when a task is assigned to a user. */
export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  projectId: string;
  workspaceId: string;
  assigneeId: string; // recipient of the notification
  assignedById: string; // who did the assigning
}

/** Emitted by the cron scanner when a task is due within the hour. */
export interface DueReminderPayload {
  taskId: string;
  taskTitle: string;
  projectId: string;
  workspaceId: string;
  assigneeId: string; // recipient of the notification
  dueAt: string; // ISO-8601 string
}

/** Emitted when a comment body contains @{userId}. */
export interface CommentMentionPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  mentionedUserId: string; // recipient of the notification
  authorId: string;
  excerpt: string; // first 120 chars of the comment body
}

/** Emitted when a task's status changes. */
export interface StatusChangedPayload {
  taskId: string;
  taskTitle: string;
  projectId: string;
  workspaceId: string;
  assigneeId: string; // recipient — only sent if the task has an assignee
  oldStatus: string;
  newStatus: string;
  changedById: string;
}

/** Discriminated union used in the processor's switch. */
export type NotificationJobName =
  | 'task_assigned'
  | 'due_reminder'
  | 'comment_mention'
  | 'status_changed';
