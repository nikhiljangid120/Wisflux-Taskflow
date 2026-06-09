// src/tasks/tasks.service.ts
import { MAX_SUBTASK_DEPTH } from './task-tree.constants';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task-entity';
import { Project } from '../projects/project.entity';
import { WorkspaceMember } from '../workspaces/workspace-member.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskStatus } from './task-status.enum';
import { ActivitiesService } from '../activities/activities.service';
import {
  ActivityType,
  ActivityEntityType,
} from '../activities/activity-type.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NOTIFICATIONS } from '../queues/queues.constants';
import {
  type TaskAssignedPayload,
  type StatusChangedPayload,
} from '../queues/job-payloads';

export interface PaginatedTasks {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    private readonly activities: ActivitiesService,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  // Returns the depth of `taskId` (root = 0). Throws if path > MAX.
  private async getDepth(taskId: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.taskRepo.query(
      `
    WITH RECURSIVE ancestors AS (
      SELECT id, "parentTaskId", 0 AS depth
      FROM tasks WHERE id = $1
      UNION ALL
      SELECT t.id, t."parentTaskId", a.depth + 1
      FROM tasks t
      INNER JOIN ancestors a ON t.id = a."parentTaskId"
      WHERE a.depth < $2
    )
    SELECT MAX(depth) AS depth FROM ancestors;
    `,
      [taskId, MAX_SUBTASK_DEPTH + 5],
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return Number(result[0]?.depth ?? 0);
  }

  // Returns true if `candidateAncestorId` is an ancestor (or self) of `taskId`.
  private async isAncestor(
    candidateAncestorId: string,
    taskId: string,
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.taskRepo.query(
      `
    WITH RECURSIVE ancestors AS (
      SELECT id, "parentTaskId"
      FROM tasks WHERE id = $1
      UNION ALL
      SELECT t.id, t."parentTaskId"
      FROM tasks t
      INNER JOIN ancestors a ON t.id = a."parentTaskId"
    )
    SELECT 1 FROM ancestors WHERE id = $2 LIMIT 1;
    `,
      [taskId, candidateAncestorId],
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return result.length > 0;
  }

  // Fetch the full subtree rooted at `taskId` as a flat list of tasks with depth.
  async getSubtree(
    projectId: string,
    taskId: string,
  ): Promise<Array<Task & { depth: number }>> {
    // Confirm the root exists in this project
    await this.findById(projectId, taskId);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.taskRepo.query(
      `
    WITH RECURSIVE tree AS (
      SELECT *, 0 AS depth
      FROM tasks WHERE id = $1
      UNION ALL
      SELECT t.*, tree.depth + 1
      FROM tasks t
      INNER JOIN tree ON t."parentTaskId" = tree.id
      WHERE tree.depth < $2
    )
    SELECT * FROM tree ORDER BY depth ASC, "createdAt" ASC;
    `,
      [taskId, MAX_SUBTASK_DEPTH + 1],
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }

  async create(
    workspaceId: string,
    projectId: string,
    dto: CreateTaskDto,
    createdById: string,
  ): Promise<Task> {
    // Confirm the project belongs to the workspace
    const project = await this.projectRepo.findOne({
      where: { id: projectId, workspaceId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // If assignee given, confirm they're a workspace member.
    if (dto.assigneeId) {
      const member = await this.memberRepo.findOne({
        where: { workspaceId, userId: dto.assigneeId },
      });
      if (!member) {
        throw new BadRequestException('Assignee must be a workspace member');
      }
    }

    // If parentTaskId given, confirm it's in the same project AND depth limit OK.
    if (dto.parentTaskId) {
      const parent = await this.taskRepo.findOne({
        where: { id: dto.parentTaskId, projectId },
      });
      if (!parent) {
        throw new BadRequestException('Parent task not found in this project');
      }
      const parentDepth = await this.getDepth(dto.parentTaskId);
      if (parentDepth >= MAX_SUBTASK_DEPTH) {
        throw new BadRequestException(
          `Subtasks cannot be nested deeper than ${MAX_SUBTASK_DEPTH} levels`,
        );
      }
    }

    const task = this.taskRepo.create({
      projectId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      assigneeId: dto.assigneeId ?? null,
      parentTaskId: dto.parentTaskId ?? null,
      createdById,
    });

    const saved = await this.taskRepo.save(task);

    await this.activities.record({
      workspaceId,
      actorId: createdById,
      type: ActivityType.TASK_CREATED,
      entityType: ActivityEntityType.TASK,
      entityId: saved.id,
      payload: { title: saved.title, projectId: saved.projectId },
    });

    return saved;
  }

  async listInProject(
    projectId: string,
    query: ListTasksQueryDto,
  ): Promise<PaginatedTasks> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.projectId = :projectId', { projectId })
      // Only top-level tasks by default — subtasks are fetched via the tree endpoint
      .andWhere('t.parentTaskId IS NULL');

    if (query.status)
      qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority)
      qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.assigneeId)
      qb.andWhere('t.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    if (query.search) {
      qb.andWhere('t.title ILIKE :search', { search: `%${query.search}%` });
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize };
  }

  async findById(projectId: string, id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id, projectId } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    workspaceId: string,
    projectId: string,
    id: string,
    dto: UpdateTaskDto,
    actorId: string,
  ): Promise<Task> {
    const task = await this.findById(projectId, id);

    // Capture previous state for activity diffing
    const prevStatus = task.status;
    const prevAssigneeId = task.assigneeId;

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId !== null) {
        const member = await this.memberRepo.findOne({
          where: { workspaceId, userId: dto.assigneeId },
        });
        if (!member) {
          throw new BadRequestException('Assignee must be a workspace member');
        }
      }
      task.assigneeId = dto.assigneeId ?? null;
    }

    if (dto.parentTaskId !== undefined) {
      if (dto.parentTaskId === null) {
        task.parentTaskId = null;
      } else {
        if (dto.parentTaskId === id) {
          throw new BadRequestException('A task cannot be its own parent');
        }
        const parent = await this.taskRepo.findOne({
          where: { id: dto.parentTaskId, projectId },
        });
        if (!parent) {
          throw new BadRequestException(
            'Parent task not found in this project',
          );
        }
        // Prevent cycles: the new parent cannot be a descendant of this task.
        if (await this.isAncestor(id, dto.parentTaskId)) {
          throw new BadRequestException(
            'Cannot move a task under its own descendant',
          );
        }
        const parentDepth = await this.getDepth(dto.parentTaskId);
        if (parentDepth >= MAX_SUBTASK_DEPTH) {
          throw new BadRequestException(
            `Subtasks cannot be nested deeper than ${MAX_SUBTASK_DEPTH} levels`,
          );
        }
        task.parentTaskId = dto.parentTaskId;
      }
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined)
      task.description = dto.description ?? null;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueAt !== undefined) {
      task.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    }
    if (dto.status !== undefined) {
      task.status = dto.status;
      // Auto-stamp completion time when status flips to DONE
      task.completedAt = dto.status === TaskStatus.DONE ? new Date() : null;
    }

    const saved = await this.taskRepo.save(task);

    // Build and emit activity events
    const events: Array<{
      type: ActivityType;
      payload: Record<string, unknown>;
    }> = [];

    if (dto.status !== undefined && dto.status !== prevStatus) {
      events.push({
        type: ActivityType.TASK_STATUS_CHANGED,
        payload: { from: prevStatus, to: dto.status },
      });
      if (dto.status === TaskStatus.DONE) {
        events.push({ type: ActivityType.TASK_COMPLETED, payload: {} });
      }
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== prevAssigneeId) {
      events.push({
        type: ActivityType.TASK_ASSIGNED,
        payload: { from: prevAssigneeId, to: dto.assigneeId },
      });
    }
    if (
      events.length === 0 &&
      (dto.title !== undefined ||
        dto.description !== undefined ||
        dto.priority !== undefined ||
        dto.dueAt !== undefined ||
        dto.parentTaskId !== undefined)
    ) {
      events.push({ type: ActivityType.TASK_UPDATED, payload: {} });
    }

    for (const e of events) {
      await this.activities.record({
        workspaceId,
        actorId,
        type: e.type,
        entityType: ActivityEntityType.TASK,
        entityId: saved.id,
        payload: e.payload,
      });
    }

    // Queue notifications if assignee changed and is not null
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== prevAssigneeId &&
      dto.assigneeId
    ) {
      const payload: TaskAssignedPayload = {
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        workspaceId: workspaceId,
        assigneeId: dto.assigneeId,
        assignedById: actorId,
      };
      await this.notificationsQueue.add('task_assigned', payload);
    }

    // Queue notifications if status changed and there is an assignee
    if (
      dto.status !== undefined &&
      dto.status !== prevStatus &&
      task.assigneeId
    ) {
      const payload: StatusChangedPayload = {
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        workspaceId: workspaceId,
        assigneeId: task.assigneeId,
        oldStatus: prevStatus,
        newStatus: dto.status,
        changedById: actorId,
      };
      await this.notificationsQueue.add('status_changed', payload);
    }

    return saved;
  }

  async remove(projectId: string, id: string): Promise<void> {
    const task = await this.findById(projectId, id);
    await this.taskRepo.remove(task);
  }
}
