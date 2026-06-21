import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CharterDeal } from './charter-deal.entity';
import { ExperienceTemplate } from './experience-template.entity';

@Entity('charters_companies')
export class ChartersCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'companyName', type: 'varchar', length: 255 })
  companyName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'contactPersonFirstName', type: 'varchar', length: 255 })
  contactPersonFirstName: string;

  @Column({ name: 'contactPersonLastName', type: 'varchar', length: 255 })
  contactPersonLastName: string;

  @Column({ name: 'mobileNumber', type: 'varchar', length: 255 })
  mobileNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 255 })
  country: string;

  @Column({ name: 'licenseNumber', type: 'varchar', length: 255 })
  licenseNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  license: string;

  @Column({ name: 'licensePublicId', type: 'varchar', length: 255, nullable: true })
  licensePublicId: string;

  @Column({ name: 'logoPublicId', type: 'varchar', length: 255, nullable: true })
  logoPublicId: string;

  @Column({ name: 'onboardedBy', type: 'varchar', length: 255 })
  onboardedBy: string;

  @Column({ name: 'adminId', type: 'int' })
  adminId: number;

  @Column({ 
    type: 'enum', 
    enum: ['pendingReview', 'active', 'inactive', 'rejected', 'draft'],
    default: 'draft'
  })
  status: string;

  @Column({ name: 'agreementForm', type: 'varchar', length: 255, nullable: true })
  agreementForm: string;

  @Column({ name: 'agreementFormPublicId', type: 'varchar', length: 255, nullable: true })
  agreementFormPublicId: string;

  @Column({ name: 'approvedBy', type: 'varchar', length: 255, nullable: true })
  approvedBy: string;

  @Column({ name: 'approvedAt', type: 'datetime', nullable: true })
  approvedAt: Date;

  @Column({ name: 'reviewRemarks', type: 'text', nullable: true })
  reviewRemarks: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => CharterDeal, deal => deal.company)
  deals: CharterDeal[];

  @OneToMany(() => ExperienceTemplate, experience => experience.company)
  experienceTemplates: ExperienceTemplate[];
} 