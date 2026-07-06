import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum CargoShipmentStatus {
  BOOKED = 'booked',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('cargo_shipments')
export class CargoShipment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userId', type: 'varchar', length: 255 })
  @Index()
  userId: string;

  @Column({ name: 'awbNumber', type: 'varchar', length: 50, unique: true })
  awbNumber: string;

  @Column({ name: 'originCode', type: 'varchar', length: 10 })
  originCode: string;

  @Column({ name: 'destinationCode', type: 'varchar', length: 10 })
  destinationCode: string;

  @Column({ name: 'weightKg', type: 'decimal', precision: 10, scale: 2 })
  weightKg: number;

  @Column({ type: 'enum', enum: CargoShipmentStatus, default: CargoShipmentStatus.BOOKED })
  status: CargoShipmentStatus;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
