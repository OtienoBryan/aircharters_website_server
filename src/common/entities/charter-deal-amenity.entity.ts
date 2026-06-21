import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CharterDeal } from './charter-deal.entity';
import { Amenity } from './amenity.entity';

@Entity('charter_deal_amenities')
export class CharterDealAmenity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dealId', type: 'int' })
  dealId: number;

  @Column({ name: 'amenityId', type: 'int' })
  amenityId: number;

  // Relations
  @ManyToOne(() => CharterDeal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealId' })
  charterDeal: CharterDeal;

  @ManyToOne(() => Amenity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'amenityId' })
  amenity: Amenity;
}
