import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CharterDealsModule } from './modules/charter-deals/charter-deals.module';
import { PassengersModule } from './modules/passengers/passengers.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TripsModule } from './modules/trips/trips.module';
import { LocationsModule } from './modules/locations/locations.module';
import { AircraftAvailabilityModule } from './modules/aircraft-availability/aircraft-availability.module';
import { DirectCharterModule } from './modules/direct-charter/direct-charter.module';
import { BookingInquiriesModule } from './modules/booking-inquiries/booking-inquiries.module';
import { GoogleEarthEngineModule } from './modules/google-earth-engine/google-earth-engine.module';
import { AmenitiesModule } from './modules/amenities/amenities.module';
import { CommissionModule } from './modules/commission/commission.module';
import { ExperiencesModule } from './modules/experiences/experiences.module';
import { AircraftModule } from './modules/aircraft/aircraft.module';
import { SmsModule } from './modules/sms/sms.module';
import { EmailModule } from './modules/email/email.module';
import { HealthController } from './health.controller';
import { User } from './common/entities/user.entity';
import { CharterDeal } from './common/entities/charter-deal.entity';
import { ChartersCompany } from './common/entities/charters-company.entity';
import { Aircraft as CharterAircraft } from './common/entities/aircraft.entity';
import { Aircraft } from './common/entities/aircraft-booking.entity';
import { Company } from './common/entities/company.entity';
import { Passenger } from './common/entities/passenger.entity';
import { Booking } from './common/entities/booking.entity';
import { Payment } from './common/entities/payment.entity';
import { WalletTransaction } from './common/entities/wallet-transaction.entity';
import { UserProfile } from './common/entities/user-profile.entity';
import { UserTrip } from './common/entities/user-trips.entity';
import { UserFile } from './common/entities/user-files.entity';
import { UserEvent } from './common/entities/user-events.entity';
import { BookingTimeline } from './common/entities/booking-timeline.entity';
import { Location } from './common/entities/location.entity';
import { AircraftAvailability } from './common/entities/aircraft-availability.entity';
import { AircraftImage } from './common/entities/aircraft-image.entity';
import { AircraftCalendar } from './common/entities/aircraft-calendar.entity';
import { BookingInquiry } from './common/entities/booking-inquiry.entity';
import { InquiryStop } from './common/entities/inquiry-stop.entity';
import { BookingStop } from './common/entities/booking-stop.entity';
import { Amenity } from './common/entities/amenity.entity';
import { AircraftAmenity } from './common/entities/aircraft-amenity.entity';
import { CharterDealAmenity } from './common/entities/charter-deal-amenity.entity';
import { AircraftTypeImagePlaceholder } from './common/entities/aircraft-type-image-placeholder.entity';
import { PlatformCommission } from './common/entities/platform-commission.entity';
import { CommissionTier } from './common/entities/commission-tier.entity';
import { CompanyCommission } from './common/entities/company-commission.entity';
import { CommissionHistory } from './common/entities/commission-history.entity';
import { CompanyPaymentAccount } from './common/entities/company-payment-account.entity';
import { TransactionLedger } from './common/entities/transaction-ledger.entity';
import { ExperienceTemplate } from './common/entities/experience-template.entity';
import { ExperienceImage } from './common/entities/experience-image.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        return {
          type: 'mysql',
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          entities: [
            User, 
            CharterDeal,
            ChartersCompany,
            CharterAircraft,
            Aircraft,
            Company,
            Passenger,
            Booking,
            Payment,
            WalletTransaction,
            UserProfile,
            UserTrip,
            UserFile,
            UserEvent,
            BookingTimeline,
            Location,
            AircraftAvailability,
            AircraftImage,
            AircraftCalendar,
            BookingInquiry,
            InquiryStop,
            BookingStop,
            Amenity,
            AircraftAmenity,
            CharterDealAmenity,
            AircraftTypeImagePlaceholder,
            PlatformCommission,
            CommissionTier,
            CompanyCommission,
            CommissionHistory,
            CompanyPaymentAccount,
            TransactionLedger,
            ExperienceTemplate,
            ExperienceImage,
          ],
          synchronize: false,
          logging: false,
          
          // MOVED HERE: Crucial fix for "Server does not support secure connection"
          // Disables SSL on local environments, but leaves room for production security.
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          
          // Connection Pooling Optimizations
          extra: {
            connectionLimit: 20,
            acquireTimeout: 60000, 
            timeout: 60000, 
            charset: 'utf8mb4_unicode_ci',
            
            // Connection management
            multipleStatements: false,
            dateStrings: true,
            
            // Performance optimizations
            supportBigNumbers: true,
            bigNumberStrings: true,
            
            // Connection health checks
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            
            // Lock timeout prevention
            lockWaitTimeout: 30000, 
            innodbLockWaitTimeout: 30, 
            
            // SSL config completely removed from here to prevent driver confusion
          },
          
          // TypeORM specific optimizations
          maxQueryExecutionTime: 30000,
          cache: {
            duration: 30000,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CharterDealsModule,
    PassengersModule,
    BookingsModule,
    PaymentsModule,
    WalletModule,
    TripsModule,
    LocationsModule,
    AircraftAvailabilityModule,
    DirectCharterModule,
    BookingInquiriesModule,
    GoogleEarthEngineModule,
    AmenitiesModule,
    CommissionModule,
    ExperiencesModule,
    SmsModule,
    EmailModule,
    AircraftModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}