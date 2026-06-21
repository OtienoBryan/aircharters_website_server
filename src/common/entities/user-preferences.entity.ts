import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  currency: string;

  @Column({ type: 'boolean', default: true })
  notifications: boolean;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 