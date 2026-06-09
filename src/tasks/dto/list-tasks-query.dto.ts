// src/tasks/dto/list-tasks-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { TaskStatus } from '../task-status.enum';
import { TaskPriority } from '../task-priority.enum';

export class ListTasksQueryDto {
  @ApiProperty({ required: false, enum: TaskStatus })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return typeof value === 'string' ? value.toUpperCase() : value;
  })
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ required: false, enum: TaskPriority })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return typeof value === 'string' ? value.toUpperCase() : value;
  })
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ required: false, description: 'Search in title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
