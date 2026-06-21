import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Booking } from './booking.entity';

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  PAYMENT = 'payment',
  REFUND = 'refund',
  BONUS = 'bonus',
  FEE = 'fee',
  LOYALTY_EARNED = 'loyalty_earned',
  LOYALTY_REDEEMED = 'loyalty_redeemed',
  LOYALTY_EXPIRED = 'loyalty_expired',
  LOYALTY_ADJUSTMENT = 'loyalty_adjustment',
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ name: 'transaction_type', type: 'enum', enum: WalletTransactionType })
  transactionType: WalletTransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'points_amount', type: 'int', default: 0 })
  pointsAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD', nullable: true })
  currency?: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference?: string;

  @Column({ name: 'balance_before', type: 'decimal', precision: 10, scale: 2, default: 0 })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 10, scale: 2, default: 0 })
  balanceAfter: number;

  @Column({ name: 'points_before', type: 'int', default: 0 })
  pointsBefore: number;

  @Column({ name: 'points_after', type: 'int', default: 0 })
  pointsAfter: number;

  @Column({ name: 'payment_method', type: 'enum', enum: ['card', 'mpesa', 'wallet', 'loyalty_points'], nullable: true })
  paymentMethod?: string;

  @Column({ name: 'payment_reference', type: 'varchar', length: 255, nullable: true })
  paymentReference?: string;

  @Column({ type: 'enum', enum: WalletTransactionStatus, default: WalletTransactionStatus.PENDING })
  status: WalletTransactionStatus;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Booking, booking => booking.id, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;
} 