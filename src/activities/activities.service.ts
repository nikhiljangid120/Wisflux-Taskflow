// src/activities/activities.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './activity-entity';
import { ActivityType, ActivityEntityType } from './activity-type.enum';

export interface RecordActivityParams {
  workspaceId: string;
  actorId: string;
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  payload?: Record<string, any>;
}

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
  ) {}

  async record(params: RecordActivityParams): Promise<Activity> {
    const activity = this.activityRepo.create({
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      type: params.type,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload ?? {},
    });
    return this.activityRepo.save(activity);
  }

  async listForWorkspace(
    workspaceId: string,
    page = 1,
    pageSize = 50,
  ): Promise<{
    data: Activity[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const [data, total] = await this.activityRepo.findAndCount({
      where: { workspaceId },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: Math.min(pageSize, 100),
    });
    return { data, total, page, pageSize };
  }

  async listForEntity(
    entityType: ActivityEntityType,
    entityId: string,
  ): Promise<Activity[]> {
    return this.activityRepo.find({
      where: { entityType, entityId },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
    });
  }
}
