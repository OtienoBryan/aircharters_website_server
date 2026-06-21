import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Aircraft } from './aircraft.entity';

@Entity('aircraft_images')
export class AircraftImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'aircraftId', type: 'int' })
  aircraftId: number;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'publicId', type: 'varchar', length: 255 })
  publicId: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Aircraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;
  imageUrl: null;
} 