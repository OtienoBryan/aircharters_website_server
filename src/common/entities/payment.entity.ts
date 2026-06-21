import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ChartersCompany } from './charters-company.entity';

export enum PaymentMethod {
  CARD = 'card',
  MPESA = 'mpesa',
  WALLET = 'wallet',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'bookingId' })
  bookingId: string;

  @Column({ name: 'userId' })
  userId: string;

  @Column({ name: 'company_id', nullable: true })
  companyId: number;

  @Column({ name: 'paymentMethod', type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ name: 'totalAmount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'platformFee', type: 'decimal', precision: 10, scale: 2 })
  platformFee: number;

  @Column({ name: 'companyAmount', type: 'decimal', precision: 10, scale: 2 })
  companyAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'transactionId', nullable: true })
  transactionId: string;

  @Column({ name: 'paymentStatus', type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ name: 'paymentGatewayResponse', type: 'json', nullable: true })
  paymentGatewayResponse: any;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ChartersCompany)
  @JoinColumn({ name: 'company_id' })
  company: ChartersCompany;

  // Computed properties
  get formattedAmount(): string {
    return `${this.currency} ${this.totalAmount.toFixed(2)}`;
  }

  get isCompleted(): boolean {
    return this.paymentStatus === PaymentStatus.COMPLETED;
  }

  get canBeRefunded(): boolean {
    return this.paymentStatus === PaymentStatus.COMPLETED;
  }
} 