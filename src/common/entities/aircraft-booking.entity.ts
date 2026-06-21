import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

export enum AircraftStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('aircraft')
export class Aircraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ name: 'companyId' })
  companyId: number;

  @Column({ 
    type: 'enum', 
    enum: AircraftStatus, 
    default: AircraftStatus.ACTIVE 
  })
  status: AircraftStatus;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @ManyToOne('Company', 'aircraft')
  @JoinColumn({ name: 'companyId' })
  company: any;

  @OneToMany('Booking', 'aircraft')
  bookings: any[];
} 