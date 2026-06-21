import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Aircraft } from './aircraft.entity';
import { ChartersCompany } from './charters-company.entity';
import { Location } from './location.entity';

export enum AvailabilityType {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  MAINTENANCE = 'maintenance',
  BLOCKED = 'blocked',
}

@Entity('aircraft_availability')
export class AircraftAvailability {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ name: 'aircraft_id', type: 'int' })
  aircraftId: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId: number;

  @Column({ name: 'booking_id', nullable: true })
  bookingId: string;

  @Column({ 
    name: 'availability_type', 
    type: 'enum', 
    enum: AvailabilityType,
    default: AvailabilityType.AVAILABLE
  })
  availabilityType: AvailabilityType;

  @Column({ name: 'start_datetime', type: 'datetime' })
  startDatetime: Date;

  @Column({ name: 'end_datetime', type: 'datetime' })
  endDatetime: Date;

  @Column({ name: 'departure_location_id', type: 'int', nullable: true })
  departureLocationId: number;

  @Column({ name: 'arrival_location_id', type: 'int', nullable: true })
  arrivalLocationId: number;

  @Column({ name: 'repositioning_required', type: 'boolean', default: false })
  repositioningRequired: boolean;

  @Column({ name: 'repositioning_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  repositioningCost: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ name: 'booking_reference', type: 'varchar', length: 100, nullable: true })
  bookingReference: string;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurrence_pattern', type: 'json', nullable: true })
  recurrencePattern: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Aircraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aircraft_id' })
  aircraft: Aircraft;

  @ManyToOne(() => ChartersCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: ChartersCompany;

  @ManyToOne(() => Location, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departure_location_id' })
  departureLocation: Location;

  @ManyToOne(() => Location, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'arrival_location_id' })
  arrivalLocation: Location;
} 