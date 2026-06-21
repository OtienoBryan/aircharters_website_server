import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ExperienceImage } from './experience-image.entity';
import { ChartersCompany } from './charters-company.entity';

@Entity('experience_templates')
export class ExperienceTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ name: 'locationName', type: 'varchar', length: 150, nullable: true })
  locationName: string;

  @Column({ name: 'isActive', type: 'tinyint', default: 1 })
  isActive: boolean;

  @Column({ name: 'termsConditions', type: 'text', nullable: true })
  termsConditions: string;

  @Column({ name: 'taxType', type: 'varchar', length: 255, nullable: true })
  taxType: string;

  @Column({ name: 'taxAmount', type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  taxAmount: number;

  @Column({ name: 'subTotal', type: 'decimal', precision: 10, scale: 2 })
  subTotal: number;

  @Column({ name: 'total', type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ name: 'durationMinutes', type: 'int' })
  durationMinutes: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ChartersCompany, company => company.experienceTemplates)
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @OneToMany(() => ExperienceImage, image => image.experience)
  images: ExperienceImage[];
}
