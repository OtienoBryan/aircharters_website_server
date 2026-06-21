import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PlatformCommission } from './platform-commission.entity';

export enum TierType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  PROMOTIONAL = 'promotional',
  REGIONAL = 'regional',
  VIP = 'vip',
}

@Entity('commission_tiers')
export class CommissionTier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tierType', type: 'enum', enum: TierType })
  tierType: TierType;

  @Column({ name: 'tierName', type: 'varchar', length: 100 })
  tierName: string; // e.g., "Standard", "Premium", "VIP"

  @Column({ name: 'percentageRate', type: 'decimal', precision: 5, scale: 2 })
  percentageRate: number; // Commission percentage for this tier

  @Column({ name: 'fixedAmount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  fixedAmount: number; // Fixed amount for this tier

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'minCommission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCommission: number;

  @Column({ name: 'maxCommission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCommission: number;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'effectiveFrom', type: 'datetime' })
  effectiveFrom: Date;

  @Column({ name: 'effectiveTo', type: 'datetime', nullable: true })
  effectiveTo: Date;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'platformCommissionId', type: 'int' })
  platformCommissionId: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => PlatformCommission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platformCommissionId' })
  platformCommission: PlatformCommission;
}
