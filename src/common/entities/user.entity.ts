import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  @Index()
  phone_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  country_code: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  date_of_birth?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality?: string;

  @Column({ type: 'varchar', length: 50, default: 'en' })
  language?: string;

  @Column({ type: 'varchar', length: 20, default: 'USD' })
  currency?: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone?: string;

  @Column({ type: 'enum', enum: Theme, default: Theme.AUTO })
  theme?: Theme;

  @Column({ type: 'text', nullable: true })
  profile_image_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile_image_public_id: string;

  @Column({ type: 'int', default: 0 })
  loyalty_points: number;

  @Column({ name: 'loyalty_tier', type: 'enum', enum: LoyaltyTier, default: LoyaltyTier.BRONZE })
  loyalty_tier?: LoyaltyTier;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  wallet_balance: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'boolean', default: false })
  phone_verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deleted_at?: Date;

  @Column({ name: 'deletion_reason', type: 'text', nullable: true })
  deletion_reason?: string;

  // Computed properties
  get fullName(): string {
    return `${this.first_name || ''} ${this.last_name || ''}`.trim();
  }

  get displayName(): string {
    return this.fullName || this.email || this.phone_number || 'Unknown User';
  }
} 