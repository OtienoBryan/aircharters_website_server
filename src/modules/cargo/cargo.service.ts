import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CargoShipment } from '../../common/entities/cargo-shipment.entity';

@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(CargoShipment)
    private readonly cargoShipmentRepository: Repository<CargoShipment>,
  ) {}

  async findForUser(userId: string): Promise<CargoShipment[]> {
    return this.cargoShipmentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByAwb(awbNumber: string): Promise<CargoShipment | null> {
    return this.cargoShipmentRepository.findOne({ where: { awbNumber } });
  }
}
