import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AircraftAvailabilityController } from './aircraft-availability.controller';
import { AircraftAvailabilityService } from './aircraft-availability.service';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { Location } from '../../common/entities/location.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { Booking } from '../../common/entities/booking.entity';
import { AircraftImage } from '../../common/entities/aircraft-image.entity';
import { AircraftCalendar } from '../../common/entities/aircraft-calendar.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Aircraft,
      Location,
      ChartersCompany,
      CharterDeal,
      Booking,
      AircraftImage,
      AircraftCalendar,
    ]),
  ],
  controllers: [AircraftAvailabilityController],
  providers: [AircraftAvailabilityService],
  exports: [AircraftAvailabilityService],
})
export class AircraftAvailabilityModule {} 