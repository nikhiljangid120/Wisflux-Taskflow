// src/notifications/notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { type NotificationJobName } from '../queues/job-payloads';

@Entity('notifications')
@Index('IDX_notifications_userId_createdAt', ['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The user who should receive this notification. */
  @Column({ type: 'uuid' })
  userId!: string;

  /** Discriminator — matches the BullMQ job name. */
  @Column({ type: 'varchar', length: 50 })
  type!: NotificationJobName;

  /**
   * Type-specific data: the same payload that was in the queue job.
   * Stored as JSONB so callers can render meaningful notification text.
   */
  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
