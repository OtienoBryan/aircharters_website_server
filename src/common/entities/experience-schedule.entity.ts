import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ExperienceTemplate } from './experience-template.entity';
import { ChartersCompany } from './charters-company.entity';
import { Aircraft } from './aircraft.entity';

@Entity('experience_schedules')
export class ExperienceSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'experienceId', type: 'int' })
  experienceId: number;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ name: 'aircraftId', type: 'int', nullable: true })
  aircraftId: number;

  @Column({ name: 'startTime', type: 'datetime' })
  startTime: Date;

  @Column({ name: 'endTime', type: 'datetime', nullable: true })
  endTime: Date;

  @Column({ name: 'priceUnit', type: 'enum', enum: ['per_person', 'per_group', 'per_hour', 'per_flight'], default: 'per_person' })
  priceUnit: 'per_person' | 'per_group' | 'per_hour' | 'per_flight';

  @Column({ name: 'durationMinutes', type: 'int' })
  durationMinutes: number;

  @Column({ name: 'seatsAvailable', type: 'int' })
  seatsAvailable: number;

  @Column({ type: 'enum', enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled' })
  status: 'scheduled' | 'cancelled' | 'completed';

  @Column({ name: 'taxType', type: 'varchar', length: 255, nullable: true })
  taxType: string;

  @Column({ name: 'subTotal', type: 'decimal', precision: 10, scale: 2 })
  subTotal: number;

  @Column({ name: 'total', type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ name: 'taxAmount', type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0.00 })
  taxAmount: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExperienceTemplate)
  @JoinColumn({ name: 'experienceId' })
  experience: ExperienceTemplate;

  @ManyToOne(() => ChartersCompany)
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @ManyToOne(() => Aircraft, { nullable: true })
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;
}
