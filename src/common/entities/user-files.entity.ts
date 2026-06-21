import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Booking } from './booking.entity';

export enum UserFileType {
  RECEIPT = 'receipt',
  TICKET = 'ticket',
  INVOICE = 'invoice',
  BOARDING_PASS = 'boarding_pass',
  ITINERARY = 'itinerary',
  OTHER = 'other',
}

@Entity('user_files')
export class UserFile {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ type: 'enum', enum: UserFileType })
  type: UserFileType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'public_id', type: 'varchar', length: 255 })
  publicId: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({ name: 'file_format', type: 'varchar', length: 10, nullable: true })
  fileFormat?: string;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Booking, booking => booking.id, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;
} 