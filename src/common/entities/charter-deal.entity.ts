import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ChartersCompany } from './charters-company.entity';
import { Aircraft } from './aircraft.entity';
import { CharterDealAmenity } from './charter-deal-amenity.entity';

@Entity('charter_deals')
export class CharterDeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ name: 'aircraftId', type: 'int' })
  aircraftId: number;

  @Column({ name: 'originName', type: 'varchar', length: 255 })
  originName: string;

  @Column({ name: 'originLatitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  originLatitude: number;

  @Column({ name: 'originLongitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  originLongitude: number;

  @Column({ name: 'destinationName', type: 'varchar', length: 255 })
  destinationName: string;

  @Column({ name: 'destinationLatitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  destinationLatitude: number;

  @Column({ name: 'destinationLongitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  destinationLongitude: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  time: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerSeat: number;

  @Column({ type: 'int', default: 0 })
  discountPerSeat: number;

  @Column({ type: 'int' })
  availableSeats: number;

  @Column({ name: 'pilotId', type: 'int', nullable: true })
  pilotId: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ChartersCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @ManyToOne(() => Aircraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;

  @OneToMany(() => CharterDealAmenity, charterDealAmenity => charterDealAmenity.charterDeal)
  charterDealAmenities: CharterDealAmenity[];
  taxType: null;
  taxAmount: null;
  price: null;
  departureDateTime: null;
  estimatedFlightHours: null;
  estimatedArrivalTime: null;
} 