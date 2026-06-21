import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PlatformCommission } from './platform-commission.entity';
import { ChartersCompany } from './charters-company.entity';

@Entity('company_commissions')
export class CompanyCommission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ name: 'platformCommissionId', type: 'int' })
  platformCommissionId: number;

  @Column({ name: 'percentageRate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentageRate: number; // Override percentage rate for this company

  @Column({ name: 'fixedAmount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  fixedAmount: number; // Override fixed amount for this company

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

  @Column({ name: 'createdBy', type: 'varchar', length: 255 })
  createdBy: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ChartersCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @ManyToOne(() => PlatformCommission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platformCommissionId' })
  platformCommission: PlatformCommission;
}
