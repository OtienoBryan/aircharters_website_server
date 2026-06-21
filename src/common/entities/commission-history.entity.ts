import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PlatformCommission } from './platform-commission.entity';
import { CommissionTier } from './commission-tier.entity';
import { CompanyCommission } from './company-commission.entity';

export enum CommissionChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  DEACTIVATED = 'deactivated',
  ACTIVATED = 'activated',
  DELETED = 'deleted',
}

export enum CommissionEntityType {
  PLATFORM = 'platform',
  TIER = 'tier',
  COMPANY = 'company',
}

@Entity('commission_history')
export class CommissionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entityType', type: 'enum', enum: CommissionEntityType })
  entityType: CommissionEntityType;

  @Column({ name: 'entityId', type: 'int' })
  entityId: number; // ID of the commission entity that was changed

  @Column({ name: 'changeType', type: 'enum', enum: CommissionChangeType })
  changeType: CommissionChangeType;

  @Column({ name: 'oldValues', type: 'json', nullable: true })
  oldValues: any; // Previous values before change

  @Column({ name: 'newValues', type: 'json', nullable: true })
  newValues: any; // New values after change

  @Column({ name: 'changedBy', type: 'varchar', length: 255 })
  changedBy: string; // User who made the change

  @Column({ name: 'changeReason', type: 'text', nullable: true })
  changeReason: string; // Reason for the change

  @Column({ name: 'ipAddress', type: 'varchar', length: 45, nullable: true })
  ipAddress: string; // IP address of the user who made the change

  @Column({ name: 'userAgent', type: 'text', nullable: true })
  userAgent: string; // User agent of the browser/app

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => PlatformCommission, { nullable: true })
  @JoinColumn({ name: 'entityId' })
  platformCommission: PlatformCommission;

  @ManyToOne(() => CommissionTier, { nullable: true })
  @JoinColumn({ name: 'entityId' })
  commissionTier: CommissionTier;

  @ManyToOne(() => CompanyCommission, { nullable: true })
  @JoinColumn({ name: 'entityId' })
  companyCommission: CompanyCommission;
}
