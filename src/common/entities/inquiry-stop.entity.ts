import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BookingInquiry } from './booking-inquiry.entity';

export enum LocationType {
  AIRPORT = 'airport',
  CITY = 'city',
  CUSTOM = 'custom',
}

@Entity('inquiry_stops')
export class InquiryStop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  bookingInquiryId: number;

  @Column('varchar', { length: 255 })
  stopName: string;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column('datetime', { nullable: true })
  datetime: Date;

  @Column('int', { default: 1 })
  stopOrder: number;

  @Column({ type: 'enum', enum: LocationType, default: LocationType.CUSTOM })
  locationType: LocationType;

  @Column('varchar', { length: 10, nullable: true })
  locationCode: string;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => BookingInquiry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingInquiryId' })
  bookingInquiry: BookingInquiry;
} 