import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharterDealsController } from './charter-deals.controller';
import { CharterDealsService } from './charter-deals.service';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { AircraftTypeImagePlaceholder } from '../../common/entities/aircraft-type-image-placeholder.entity';
import { AmenitiesModule } from '../amenities/amenities.module';
import { GoogleEarthEngineModule } from '../google-earth-engine/google-earth-engine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CharterDeal,
      ChartersCompany,
      Aircraft,
      AircraftTypeImagePlaceholder,
    ]),
    AmenitiesModule,
    GoogleEarthEngineModule,
  ],
  controllers: [CharterDealsController],
  providers: [CharterDealsService],
  exports: [CharterDealsService],
})
export class CharterDealsModule {} 