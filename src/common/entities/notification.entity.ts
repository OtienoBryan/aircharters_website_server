import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  BOOKING = 'booking',
  PAYMENT = 'payment',
  LOYALTY = 'loyalty',
  SYSTEM = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userId', type: 'varchar', length: 255 })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.SYSTEM })
  type: NotificationType;

  @Column({ name: 'isRead', type: 'tinyint', default: 0 })
  isRead: boolean;

  @Column({ name: 'relatedBookingId', type: 'int', nullable: true })
  relatedBookingId: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
