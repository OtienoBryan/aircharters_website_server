import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Booking } from './booking.entity';

export enum LocationType {
  AIRPORT = 'airport',
  CITY = 'city',
  CUSTOM = 'custom',
}

@Entity('charter_booking_stops')
export class BookingStop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'booking_id', type: 'int' })
  bookingId: number;

  @Column({ name: 'stop_name', type: 'varchar', length: 255 })
  stopName: string;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('datetime', { nullable: true })
  datetime: Date;

  @Column({ name: 'stop_order', type: 'int', default: 1 })
  stopOrder: number;

  @Column({ name: 'location_type', type: 'enum', enum: LocationType, default: LocationType.CUSTOM })
  locationType: LocationType;

  @Column({ name: 'location_code', type: 'varchar', length: 10, nullable: true })
  locationCode: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;
}
