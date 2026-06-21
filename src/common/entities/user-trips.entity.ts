import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Booking, BookingStatus } from './booking.entity';

export enum UserTripStatus {
  UPCOMING = 'upcoming',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('user_trips')
export class UserTrip {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'enum', enum: UserTripStatus })
  status: UserTripStatus;

  @Column({ type: 'int', nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  review?: string;

  @Column({ name: 'review_date', type: 'timestamp', nullable: true })
  reviewDate?: Date;

  @Column({ type: 'text', nullable: true })
  photos?: string;

  @Column({ type: 'text', nullable: true })
  videos?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Booking, booking => booking.id)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  /**
   * Calculate the current status based on booking status and flight date
   * This provides a single source of truth for trip status
   */
  get calculatedStatus(): UserTripStatus {
    // If explicitly cancelled, return cancelled
    if (this.status === UserTripStatus.CANCELLED) {
      return UserTripStatus.CANCELLED;
    }

    // If booking is cancelled, trip should be cancelled
    if (this.booking?.bookingStatus === BookingStatus.CANCELLED) {
      return UserTripStatus.CANCELLED;
    }

    // If booking is confirmed, check flight date
    if (this.booking?.bookingStatus === BookingStatus.CONFIRMED) {
      const flightDate = new Date(this.booking.deal?.date);
      const now = new Date();
      
      // If flight date has passed, trip is completed
      if (flightDate < now) {
        return UserTripStatus.COMPLETED;
      } else {
        return UserTripStatus.UPCOMING;
      }
    }

    // Default to upcoming for any other booking status
    return UserTripStatus.UPCOMING;
  }

  /**
   * Check if the trip status needs to be updated based on current booking status and flight date
   */
  get needsStatusUpdate(): boolean {
    return this.calculatedStatus !== this.status;
  }
} 