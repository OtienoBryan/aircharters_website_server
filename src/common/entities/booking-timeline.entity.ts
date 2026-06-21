import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Booking, BookingStatus, PaymentStatus } from './booking.entity';

export enum TimelineEventType {
  BOOKING_CREATED = 'booking_created',
  STATUS_CHANGED = 'status_changed',
  PAYMENT_STATUS_CHANGED = 'payment_status_changed',
  PAYMENT_COMPLETED = 'payment_completed',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_CONFIRMED = 'booking_confirmed',
  REMINDER_SENT = 'reminder_sent',
  CHECK_IN = 'check_in',
  FLIGHT_COMPLETED = 'flight_completed',
  LOYALTY_UPDATED = 'loyalty_updated',
}

@Entity('booking_timeline')
export class BookingTimeline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bookingId' })
  bookingId: number;

  @Column({ 
    name: 'eventType', 
    type: 'enum', 
    enum: TimelineEventType 
  })
  eventType: TimelineEventType;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'oldValue', type: 'varchar', length: 100, nullable: true })
  oldValue: string;

  @Column({ name: 'newValue', type: 'varchar', length: 100, nullable: true })
  newValue: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;
} 