import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ChartersCompany } from './charters-company.entity';
import { Payment } from './payment.entity';
import { PaymentProvider } from './company-payment-account.entity';

export enum TransactionType {
  PAYMENT_RECEIVED = 'payment_received',
  PLATFORM_FEE = 'platform_fee',
  COMPANY_PAYOUT = 'company_payout',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

// Use the same PaymentProvider enum from company-payment-account.entity.ts

export enum Currency {
  USD = 'USD',
  KES = 'KES',
  EUR = 'EUR',
  GBP = 'GBP',
}

@Entity('transaction_ledger')
@Index(['transactionId'], { unique: true })
@Index(['companyId', 'createdAt'])
@Index(['paymentProvider', 'createdAt'])
@Index(['transactionType', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['bookingId'])
@Index(['userId'])
export class TransactionLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'transactionId', type: 'varchar', length: 255, unique: true })
  transactionId: string; // Unique transaction identifier

  @Column({ name: 'parentTransactionId', type: 'varchar', length: 255, nullable: true })
  parentTransactionId: string; // For related transactions (e.g., split payments)

  @Column({ name: 'companyId', type: 'int', nullable: true })
  companyId: number; // Company involved in the transaction

  @Column({ name: 'userId', type: 'int', nullable: true })
  userId: number; // User who initiated the transaction

  @Column({ name: 'bookingId', nullable: true })
  bookingId: string; // Associated booking

  @Column({ name: 'transactionType', type: 'enum', enum: TransactionType })
  transactionType: TransactionType;

  @Column({ name: 'paymentProvider', type: 'enum', enum: PaymentProvider })
  paymentProvider: PaymentProvider;

  @Column({ name: 'providerTransactionId', type: 'varchar', length: 255, nullable: true })
  providerTransactionId: string; // External provider transaction ID

  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 })
  amount: number; // Transaction amount

  @Column({ name: 'currency', type: 'enum', enum: Currency, default: Currency.USD })
  currency: Currency;

  @Column({ name: 'exchangeRate', type: 'decimal', precision: 10, scale: 6, default: 1.0 })
  exchangeRate: number; // Exchange rate to base currency

  @Column({ name: 'baseAmount', type: 'decimal', precision: 15, scale: 2 })
  baseAmount: number; // Amount in base currency (USD)

  @Column({ name: 'fee', type: 'decimal', precision: 15, scale: 2, default: 0 })
  fee: number; // Transaction fee

  @Column({ name: 'tax', type: 'decimal', precision: 15, scale: 2, default: 0 })
  tax: number; // Tax amount

  @Column({ name: 'netAmount', type: 'decimal', precision: 15, scale: 2 })
  netAmount: number; // Net amount after fees and taxes

  @Column({ name: 'status', type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string; // Transaction description

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: any; // Additional transaction data

  @Column({ name: 'providerMetadata', type: 'json', nullable: true })
  providerMetadata: any; // Provider-specific data

  @Column({ name: 'errorMessage', type: 'text', nullable: true })
  errorMessage: string; // Error message if transaction failed

  @Column({ name: 'processedAt', type: 'datetime', nullable: true })
  processedAt: Date; // When transaction was processed

  @Column({ name: 'settledAt', type: 'datetime', nullable: true })
  settledAt: Date; // When transaction was settled

  @Column({ name: 'reversedAt', type: 'datetime', nullable: true })
  reversedAt: Date; // When transaction was reversed

  @Column({ name: 'reversalReason', type: 'text', nullable: true })
  reversalReason: string; // Reason for reversal

  @Column({ name: 'ipAddress', type: 'varchar', length: 45, nullable: true })
  ipAddress: string; // IP address of transaction initiator

  @Column({ name: 'userAgent', type: 'text', nullable: true })
  userAgent: string; // User agent of transaction initiator

  @Column({ name: 'isReconciled', type: 'boolean', default: false })
  isReconciled: boolean; // Whether transaction has been reconciled

  @Column({ name: 'reconciledAt', type: 'datetime', nullable: true })
  reconciledAt: Date; // When transaction was reconciled

  @Column({ name: 'reconciliationNotes', type: 'text', nullable: true })
  reconciliationNotes: string; // Reconciliation notes

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ChartersCompany, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'parentTransactionId', referencedColumnName: 'transactionId' })
  parentTransaction: Payment;
}
