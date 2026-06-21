import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AircraftController } from './aircraft.controller';
import { AircraftService } from './aircraft.service';
import { Aircraft } from '../../common/entities/aircraft.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Aircraft]),
  ],
  controllers: [AircraftController],
  providers: [AircraftService],
  exports: [AircraftService],
})
export class AircraftModule {}
