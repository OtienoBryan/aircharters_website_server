import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperiencesController } from './experiences.controller';
import { ExperiencesService } from './experiences.service';
import { ExperienceImage } from '../../common/entities/experience-image.entity';
import { ExperienceTemplate } from '../../common/entities/experience-template.entity';
import { ExperienceSchedule } from '../../common/entities/experience-schedule.entity';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { AircraftImage } from '../../common/entities/aircraft-image.entity';
import { Booking } from '../../common/entities/booking.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExperienceTemplate,
      ExperienceImage,
      ExperienceSchedule,
      Aircraft,
      AircraftImage,
      Booking,
    ]),
    EmailModule,
  ],
  controllers: [ExperiencesController],
  providers: [ExperiencesService],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
