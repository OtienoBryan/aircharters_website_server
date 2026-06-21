import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { CharterDeal } from './charter-deal.entity';
import { ChartersCompany } from './charters-company.entity';
import { AircraftImage } from './aircraft-image.entity';
import { AircraftAmenity } from './aircraft-amenity.entity';
import { AircraftTypeImagePlaceholder } from './aircraft-type-image-placeholder.entity';

@Entity('aircrafts')
export class Aircraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'registrationNumber', type: 'varchar', length: 20, unique: true })
  registrationNumber: string;

  @Column({ 
    type: 'enum', 
    enum: ['helicopter', 'fixedWing', 'jet', 'glider', 'seaplane', 'ultralight', 'balloon', 'tiltrotor', 'gyroplane', 'airship']
  })
  type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string;

  @Column({ name: 'yearManufactured', type: 'int', nullable: true })
  yearManufactured: number;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ name: 'pricePerHour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerHour: number;

  // Cruise speed in knots (KTAS). Used for NM-based duration calculations.
  @Column({ name: 'cruiseSpeedKnots', type: 'int', nullable: true })
  cruiseSpeedKnots: number | null;

  @Column({ name: 'isAvailable', type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ 
    name: 'maintenanceStatus', 
    type: 'enum', 
    enum: ['operational', 'maintenance', 'out_of_service'],
    default: 'operational'
  })
  maintenanceStatus: string;

  @Column({ name: 'baseAirport', type: 'varchar', length: 100, nullable: true })
  baseAirport: string;

  @Column({ name: 'baseCity', type: 'varchar', length: 100, nullable: true })
  baseCity: string;

  @Column({ name: 'aircraftTypeImagePlaceholderId', type: 'int', nullable: true })
  aircraftTypeImagePlaceholderId: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ChartersCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @OneToMany(() => CharterDeal, deal => deal.aircraft)
  deals: CharterDeal[];

  @OneToMany(() => AircraftImage, image => image.aircraft)
  images: AircraftImage[];

  @OneToMany(() => AircraftAmenity, aircraftAmenity => aircraftAmenity.aircraft)
  aircraftAmenities: AircraftAmenity[];

  @ManyToOne(() => AircraftTypeImagePlaceholder, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'aircraftTypeImagePlaceholderId' })
  aircraftTypeImagePlaceholder: AircraftTypeImagePlaceholder;
} 