import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ExperienceTemplate } from './experience-template.entity';

@Entity('experience_images')
export class ExperienceImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'experienceId', type: 'int' })
  experienceId: number;

  @Column({ name: 'imageSlot', type: 'varchar', length: 50 })
  imageSlot: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'publicId', type: 'varchar', length: 255 })
  publicId: string;

  @Column({ name: 'sortOrder', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExperienceTemplate, experience => experience.images)
  @JoinColumn({ name: 'experienceId' })
  experience: ExperienceTemplate;
}
