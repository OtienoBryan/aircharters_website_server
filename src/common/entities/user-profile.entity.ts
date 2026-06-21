import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum SeatPreference {
  WINDOW = 'window',
  AISLE = 'aisle',
  ANY = 'any',
}

@Entity('user_profile')
export class UserProfile {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'seat_preference', type: 'enum', enum: SeatPreference, default: SeatPreference.ANY })
  seatPreference: SeatPreference;

  @Column({ name: 'meal_preference', type: 'text', nullable: true })
  mealPreference?: string;

  @Column({ name: 'special_assistance', type: 'text', nullable: true })
  specialAssistance?: string;

  @Column({ name: 'email_notifications', type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ name: 'sms_notifications', type: 'boolean', default: true })
  smsNotifications: boolean;

  @Column({ name: 'push_notifications', type: 'boolean', default: true })
  pushNotifications: boolean;

  @Column({ name: 'marketing_emails', type: 'boolean', default: true })
  marketingEmails: boolean;

  @Column({ name: 'profile_visible', type: 'boolean', default: false })
  profileVisible: boolean;

  @Column({ name: 'data_sharing', type: 'boolean', default: false })
  dataSharing: boolean;

  @Column({ name: 'location_tracking', type: 'boolean', default: true })
  locationTracking: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;
} 