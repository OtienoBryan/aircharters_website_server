import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CommissionTier } from './commission-tier.entity';
import { CompanyCommission } from './company-commission.entity';

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  HYBRID = 'hybrid',
}

export enum BookingType {
  CHARTER_DEAL = 'charter_deal',
  DIRECT_CHARTER = 'direct_charter',
}

@Entity('platform_commissions')
export class PlatformCommission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'commissionType', type: 'enum', enum: CommissionType, default: CommissionType.PERCENTAGE })
  commissionType: CommissionType;

  @Column({ name: 'bookingType', type: 'enum', enum: BookingType })
  bookingType: BookingType;

  @Column({ name: 'percentageRate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentageRate: number; // e.g., 10.50 for 10.5%

  @Column({ name: 'fixedAmount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  fixedAmount: number; // Fixed amount per booking

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'minCommission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCommission: number; // Minimum commission amount

  @Column({ name: 'maxCommission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCommission: number; // Maximum commission amount

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'effectiveFrom', type: 'datetime' })
  effectiveFrom: Date;

  @Column({ name: 'effectiveTo', type: 'datetime', nullable: true })
  effectiveTo: Date; // null means no end date

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'createdBy', type: 'varchar', length: 255 })
  createdBy: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => CommissionTier, tier => tier.platformCommission)
  tiers: CommissionTier[];

  @OneToMany(() => CompanyCommission, companyCommission => companyCommission.platformCommission)
  companyCommissions: CompanyCommission[];
}
