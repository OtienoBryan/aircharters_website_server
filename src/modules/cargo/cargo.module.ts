import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoService } from './cargo.service';
import { CargoController } from './cargo.controller';
import { CargoShipment } from '../../common/entities/cargo-shipment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CargoShipment])],
  controllers: [CargoController],
  providers: [CargoService],
  exports: [CargoService],
})
export class CargoModule {}
