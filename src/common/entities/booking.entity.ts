import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CharterDeal } from './charter-deal.entity';
import { ChartersCompany } from './charters-company.entity';
import { Passenger } from './passenger.entity';
import { Aircraft } from './aircraft.entity';
import { BookingStop } from './booking-stop.entity';

export enum BookingStatus {
  PENDING = 'pending',
  PRICED = 'priced',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum BookingType {
  DIRECT = 'direct',
  DEAL = 'deal',
  EXPERIENCE = 'experience',
}

@Entity('charter_bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userId', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ name: 'aircraftId', type: 'int', nullable: true })
  aircraftId: number;

  @Column({ 
    name: 'bookingType', 
    type: 'enum', 
    enum: BookingType 
  })
  bookingType: BookingType;

  @Column({ name: 'dealId', type: 'int', nullable: true })
  dealId: number;

  @Column({ name: 'experienceTemplateId', type: 'int', nullable: true })
  experienceTemplateId: number;

  @Column({ name: 'totalPrice', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number;

  @Column({ name: 'taxType', type: 'varchar', length: 50, nullable: true })
  taxType: string;

  @Column({ name: 'taxAmount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  taxAmount: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2, nullable: true })
  subtotal: number;

  @Column({ 
    name: 'bookingStatus', 
    type: 'enum', 
    enum: BookingStatus, 
    default: BookingStatus.PENDING 
  })
  bookingStatus: BookingStatus;

  @Column({ 
    name: 'paymentStatus', 
    type: 'enum', 
    enum: PaymentStatus, 
    default: PaymentStatus.PENDING 
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'referenceNumber', type: 'varchar', length: 50 })
  referenceNumber: string;

  @Column({ name: 'specialRequirements', type: 'text', nullable: true })
  specialRequirements: string;

  @Column({ name: 'adminNotes', type: 'text', nullable: true })
  adminNotes: string;

  @Column({ name: 'originName', type: 'varchar', length: 255, nullable: true })
  originName: string;

  @Column({ name: 'originLatitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  originLatitude: number;

  @Column({ name: 'originLongitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  originLongitude: number;

  @Column({ name: 'destinationName', type: 'varchar', length: 255, nullable: true })
  destinationName: string;

  @Column({ name: 'destinationLatitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  destinationLatitude: number;

  @Column({ name: 'destinationLongitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  destinationLongitude: number;

  @Column({ name: 'departureDateTime', type: 'datetime', nullable: true })
  departureDateTime: Date;

  @Column({ name: 'estimatedFlightHours', type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimatedFlightHours: number;

  @Column({ name: 'distanceNm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceNm: number;

  @Column({ name: 'estimatedArrivalTime', type: 'datetime', nullable: true })
  estimatedArrivalTime: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @Column({ name: 'totalAdults', type: 'int', default: 0 })
  totalAdults: number;

  @Column({ name: 'totalChildren', type: 'int', default: 0 })
  totalChildren: number;

  @Column({ name: 'onboardDining', type: 'tinyint', default: 0 })
  onboardDining: boolean;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => CharterDeal, { nullable: true })
  @JoinColumn({ name: 'dealId' })
  deal: CharterDeal;

  @ManyToOne(() => ChartersCompany)
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @ManyToOne(() => Aircraft, { nullable: true })
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;

  @OneToMany(() => Passenger, passenger => passenger.booking)
  passengers: Passenger[];

  @OneToMany(() => BookingStop, stop => stop.booking, { cascade: true })
  stops: BookingStop[];

  // Computed properties
  get formattedPrice(): string {
    return this.totalPrice ? `$${this.totalPrice.toFixed(2)}` : 'N/A';
  }

  get isConfirmed(): boolean {
    return this.bookingStatus === BookingStatus.CONFIRMED || 
           this.bookingStatus === BookingStatus.COMPLETED;
  }

  get isPaid(): boolean {
    return this.paymentStatus === PaymentStatus.PAID;
  }

  get canBeCancelled(): boolean {
    return this.bookingStatus === BookingStatus.PENDING || 
           this.bookingStatus === BookingStatus.PRICED ||
           this.bookingStatus === BookingStatus.CONFIRMED;
  }

  get isPending(): boolean {
    return this.bookingStatus === BookingStatus.PENDING || 
           this.bookingStatus === BookingStatus.PRICED;
  }
} 
