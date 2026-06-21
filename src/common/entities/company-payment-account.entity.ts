import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChartersCompany } from './charters-company.entity';

export enum PaymentProvider {
  STRIPE = 'stripe',
  MPESA = 'mpesa',
  PAYSTACK = 'paystack',
}

export enum AccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum AccountType {
  EXPRESS = 'express',
  CUSTOM = 'custom',
  STANDARD = 'standard',
}

@Entity('company_payment_accounts')
export class CompanyPaymentAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ name: 'paymentProvider', type: 'enum', enum: PaymentProvider })
  paymentProvider: PaymentProvider;

  @Column({ name: 'accountType', type: 'enum', enum: AccountType, default: AccountType.EXPRESS })
  accountType: AccountType;

  @Column({ name: 'accountId', type: 'varchar', length: 255, unique: true })
  accountId: string; // Stripe account ID or M-Pesa merchant ID

  @Column({ name: 'accountStatus', type: 'enum', enum: AccountStatus, default: AccountStatus.PENDING })
  accountStatus: AccountStatus;

  @Column({ name: 'verificationStatus', type: 'varchar', length: 50, default: 'pending' })
  verificationStatus: string; // 'pending', 'verified', 'failed'

  @Column({ name: 'country', type: 'varchar', length: 2 })
  country: string; // ISO 2-letter country code

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'capabilities', type: 'json', nullable: true })
  capabilities: any; // Payment capabilities (card_payments, transfers, etc.)

  @Column({ name: 'requirements', type: 'json', nullable: true })
  requirements: any; // KYC requirements and status

  @Column({ name: 'businessProfile', type: 'json', nullable: true })
  businessProfile: any; // Business information

  @Column({ name: 'bankAccountInfo', type: 'json', nullable: true })
  bankAccountInfo: any; // Bank account details (encrypted)

  @Column({ name: 'onboardingUrl', type: 'varchar', length: 500, nullable: true })
  onboardingUrl: string; // Stripe Connect onboarding URL

  @Column({ name: 'dashboardUrl', type: 'varchar', length: 500, nullable: true })
  dashboardUrl: string; // Stripe dashboard URL

  @Column({ name: 'lastPayoutDate', type: 'datetime', nullable: true })
  lastPayoutDate: Date;

  @Column({ name: 'totalPayouts', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPayouts: number;

  @Column({ name: 'pendingBalance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  pendingBalance: number;

  @Column({ name: 'availableBalance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: any; // Additional provider-specific data

  // Paystack-specific field (MINIMAL APPROACH)
  @Column({ name: 'paystackSubaccountId', type: 'varchar', length: 255, nullable: true })
  paystackSubaccountId: string; // Paystack subaccount ID (e.g., ACCT_xxxxx)

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ChartersCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;
}
