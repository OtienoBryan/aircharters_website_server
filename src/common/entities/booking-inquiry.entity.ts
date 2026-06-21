import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Aircraft } from './aircraft.entity';
import { InquiryStop } from './inquiry-stop.entity';

export enum InquiryStatus {
  PENDING = 'pending',
  PRICED = 'priced',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum ProposedPriceType {
  PER_SEAT = 'per_seat',
  PER_HOUR = 'per_hour',
  TOTAL = 'total',
}

@Entity('booking_inquiries')
export class BookingInquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 255 })
  userId: string;

  @Column('int')
  aircraftId: number;

  @Column('int')
  company_id: number;

  @Column({ type: 'enum', enum: InquiryStatus, default: InquiryStatus.PENDING })
  inquiryStatus: InquiryStatus;

  @Column('int', { default: 1 })
  requestedSeats: number;

  @Column('text', { nullable: true })
  specialRequirements: string;

  @Column('boolean', { default: false })
  onboardDining: boolean;

  @Column('boolean', { default: false })
  groundTransportation: boolean;

  @Column('varchar', { length: 100, nullable: true })
  billingRegion: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  proposedPrice: number;

  @Column({ type: 'enum', enum: ProposedPriceType, nullable: true })
  proposedPriceType: ProposedPriceType;

  @Column('text', { nullable: true })
  adminNotes: string;

  @Column('text', { nullable: true })
  userNotes: string;

  @Column('varchar', { length: 50 })
  referenceNumber: string;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;

  @Column('datetime', { precision: 6, nullable: true })
  pricedAt: Date;

  @Column('datetime', { precision: 6, nullable: true })
  confirmedAt: Date;

  @Column('datetime', { precision: 6, nullable: true })
  cancelledAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Aircraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;

  @OneToMany(() => InquiryStop, (stop: InquiryStop) => stop.bookingInquiry, { cascade: true })
  stops: InquiryStop[];
} 