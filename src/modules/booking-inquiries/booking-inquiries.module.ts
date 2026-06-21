import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingInquiriesController } from './booking-inquiries.controller';
import { BookingInquiriesService } from './booking-inquiries.service';
import { GoogleEarthEngineService } from '../google-earth-engine/google-earth-engine.service';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { BookingInquiry } from '../../common/entities/booking-inquiry.entity';
import { InquiryStop } from '../../common/entities/inquiry-stop.entity';
import { BookingStop } from '../../common/entities/booking-stop.entity';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { User } from '../../common/entities/user.entity';
import { Booking } from '../../common/entities/booking.entity';
import { Payment } from '../../common/entities/payment.entity';
import { AircraftCalendar } from '../../common/entities/aircraft-calendar.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingInquiry, InquiryStop, BookingStop, Aircraft, User, Booking, Payment, AircraftCalendar, ChartersCompany]),
    PaymentsModule,
    EmailModule,
    SmsModule,
  ],
  controllers: [BookingInquiriesController],
  providers: [BookingInquiriesService],
  exports: [BookingInquiriesService],
})
export class BookingInquiriesModule {} 