import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Aircraft } from './aircraft.entity';

@Entity('aircraft_type_image_placeholders')
export class AircraftTypeImagePlaceholder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    type: 'enum', 
    enum: ['helicopter', 'fixedWing', 'jet', 'glider', 'seaplane', 'ultralight', 'balloon', 'tiltrotor', 'gyroplane', 'airship']
  })
  type: string;

  @Column({ name: 'placeholderImageUrl', type: 'varchar', length: 255 })
  placeholderImageUrl: string;

  @Column({ name: 'placeholderImagePublicId', type: 'varchar', length: 255 })
  placeholderImagePublicId: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Aircraft, aircraft => aircraft.aircraftTypeImagePlaceholder)
  aircraft: Aircraft[];
}
