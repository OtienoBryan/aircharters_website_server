import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from '../../common/entities/booking.entity';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { ExperienceTemplate } from '../../common/entities/experience-template.entity';
import { Passenger } from '../../common/entities/passenger.entity';
import { BookingTimeline } from '../../common/entities/booking-timeline.entity';
import { UserTrip } from '../../common/entities/user-trips.entity';
import { WalletTransaction } from '../../common/entities/wallet-transaction.entity';
import { User } from '../../common/entities/user.entity';
import { Payment } from '../../common/entities/payment.entity';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';
import { BookingPaymentService } from './services/booking-payment.service';
import { BookingTimelineService } from './services/booking-timeline.service';
import { BookingQueryService } from './services/booking-query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, CharterDeal, ExperienceTemplate, Passenger, BookingTimeline, UserTrip, WalletTransaction, User, Payment]),
    WalletModule,
    PaymentsModule, // Import PaymentsModule to access PaymentProviderService
    EmailModule, // Import EmailModule to access EmailService
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingPaymentService,
    BookingTimelineService,
    BookingQueryService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {} 