import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AircraftAmenity } from './aircraft-amenity.entity';
import { CharterDealAmenity } from './charter-deal-amenity.entity';

@Entity('amenities')
export class Amenity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Relations
  @OneToMany(() => AircraftAmenity, aircraftAmenity => aircraftAmenity.amenity)
  aircraftAmenities: AircraftAmenity[];

  @OneToMany(() => CharterDealAmenity, charterDealAmenity => charterDealAmenity.amenity)
  charterDealAmenities: CharterDealAmenity[];
}
