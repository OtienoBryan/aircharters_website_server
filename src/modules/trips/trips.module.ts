import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripSchedulerService } from './trip-scheduler.service';
import { UserTrip } from '../../common/entities/user-trips.entity';
import { Booking } from '../../common/entities/booking.entity';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';
import { Aircraft } from '../../common/entities/aircraft.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTrip,
      Booking,
      CharterDeal,
      ChartersCompany,
      Aircraft,
    ]),
  ],
  controllers: [TripsController],
  providers: [TripsService, TripSchedulerService],
  exports: [TripsService, TripSchedulerService],
})
export class TripsModule {} 