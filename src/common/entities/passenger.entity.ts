import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Booking } from './booking.entity';

@Entity('charter_passengers')
export class Passenger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'booking_id', type: 'int' })
  @Index()
  booking_id: number;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  first_name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string;

  @Column({ name: 'id_passport_number', type: 'varchar', length: 100, nullable: true })
  id_passport_number: string;

  @Column({ name: 'is_user', type: 'boolean', default: false })
  is_user: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Computed property for full name
  get fullName(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  // Computed property for display name
  get displayName(): string {
    return this.fullName || 'Unnamed Passenger';
  }

  // Relations
  @ManyToOne(() => Booking, booking => booking.passengers)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;
} 
