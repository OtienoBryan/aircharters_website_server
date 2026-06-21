import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmenitiesController } from './amenities.controller';
import { AmenitiesService } from './amenities.service';
import { Amenity } from '../../common/entities/amenity.entity';
import { AircraftAmenity } from '../../common/entities/aircraft-amenity.entity';
import { CharterDealAmenity } from '../../common/entities/charter-deal-amenity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Amenity, AircraftAmenity, CharterDealAmenity]),
  ],
  controllers: [AmenitiesController],
  providers: [AmenitiesService],
  exports: [AmenitiesService],
})
export class AmenitiesModule {}
