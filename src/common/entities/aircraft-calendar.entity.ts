import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Aircraft } from './aircraft.entity';
import { Company } from './company.entity';
import { Booking } from './booking.entity';

export enum CalendarEventType {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  MAINTENANCE = 'maintenance',
  BLOCKED = 'blocked'
}

@Entity('aircraft_calendar')
export class AircraftCalendar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'aircraftId' })
  aircraftId: number;

  @Column({ name: 'companyId' })
  companyId: number;

  @Column({ name: 'startDateTime', type: 'datetime' })
  startDateTime: Date;

  @Column({ name: 'endDateTime', type: 'datetime' })
  endDateTime: Date;

  @Column({
    name: 'eventType',
    type: 'enum',
    enum: CalendarEventType,
    default: CalendarEventType.AVAILABLE
  })
  eventType: CalendarEventType;

  @Column({ name: 'bookingId', nullable: true })
  bookingId?: string;

  @Column({ name: 'originAirport', nullable: true, length: 100 })
  originAirport?: string;

  @Column({ name: 'destinationAirport', nullable: true, length: 100 })
  destinationAirport?: string;

  @Column({ name: 'passengerCount', nullable: true })
  passengerCount?: number;

  @Column({ name: 'totalPrice', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice?: number;

  @Column({ name: 'pricePerHour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerHour?: number;

  @Column({ name: 'repositioningCost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  repositioningCost?: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Aircraft, aircraft => aircraft.id)
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;

  @ManyToOne(() => Company, company => company.id)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Booking, booking => booking.id)
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;
} 