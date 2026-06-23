import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AircraftController } from './aircraft.controller';
import { AircraftService } from './aircraft.service';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { AircraftImage } from '../../common/entities/aircraft-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Aircraft, AircraftImage]),
  ],
  controllers: [AircraftController],
  providers: [AircraftService],
  exports: [AircraftService],
})
export class AircraftModule {}
