import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Aircraft } from './aircraft.entity';
import { Amenity } from './amenity.entity';

@Entity('aircraft_amenities')
export class AircraftAmenity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'aircraftId', type: 'int' })
  aircraftId: number;

  @Column({ name: 'amenityId', type: 'int' })
  amenityId: number;

  // Relations
  @ManyToOne(() => Aircraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;

  @ManyToOne(() => Amenity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'amenityId' })
  amenity: Amenity;
}
