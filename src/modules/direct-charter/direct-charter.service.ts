import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, DataSource, DeepPartial } from 'typeorm';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { AircraftCalendar, CalendarEventType } from '../../common/entities/aircraft-calendar.entity';
import { Booking, BookingType, BookingStatus, PaymentStatus } from '../../common/entities/booking.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';
import { Passenger } from '../../common/entities/passenger.entity';
import { BookingStop, LocationType } from '../../common/entities/booking-stop.entity';
import { User } from '../../common/entities/user.entity';
import { Payment } from '../../common/entities/payment.entity';
import { AircraftTypeImagePlaceholder } from '../../common/entities/aircraft-type-image-placeholder.entity';
import { SearchDirectCharterDto } from './dto/search-direct-charter.dto';
import { BookDirectCharterDto } from './dto/book-direct-charter.dto';
import { PaymentProviderService } from '../payments/services/payment-provider.service';
import { PaymentProviderType } from '../payments/interfaces/payment-provider.interface';
import { GoogleEarthEngineService } from '../google-earth-engine/google-earth-engine.service';
import { PassengerValidationService } from './services/passenger-validation.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class DirectCharterService {
  constructor(
    @InjectRepository(Aircraft)
    private aircraftRepository: Repository<Aircraft>,
    @InjectRepository(AircraftCalendar)
    private aircraftCalendarRepository: Repository<AircraftCalendar>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(ChartersCompany)
    private companyRepository: Repository<ChartersCompany>,
    @InjectRepository(Passenger)
    private passengerRepository: Repository<Passenger>,
    @InjectRepository(BookingStop)
    private bookingStopRepository: Repository<BookingStop>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(AircraftTypeImagePlaceholder)
    private aircraftTypeImagePlaceholderRepository: Repository<AircraftTypeImagePlaceholder>,
    private readonly dataSource: DataSource,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly googleEarthEngineService: GoogleEarthEngineService,
    private readonly passengerValidationService: PassengerValidationService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async searchAvailableAircraft(searchDto: SearchDirectCharterDto) {
    const { origin, destination, departureDateTime, returnDateTime, passengerCount, tripType, aircraftTypeImagePlaceholderId } = searchDto;
    
    const departureDate = new Date(departureDateTime);
    const returnDate = returnDateTime ? new Date(returnDateTime) : null;

    // Get all available aircraft that meet capacity requirements
    let query = this.aircraftRepository
      .createQueryBuilder('aircraft')
      .leftJoinAndSelect('aircraft.company', 'company')
      .leftJoinAndSelect('aircraft.images', 'images')
      .leftJoinAndSelect('aircraft.aircraftTypeImagePlaceholder', 'aircraftType')
      .where('aircraft.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' })
      .andWhere('aircraft.capacity >= :passengerCount', { passengerCount });

    // Add aircraft type filter if provided
    if (aircraftTypeImagePlaceholderId) {
      query = query.andWhere('aircraft.aircraftTypeImagePlaceholderId = :aircraftTypeId', { 
        aircraftTypeId: aircraftTypeImagePlaceholderId 
      });
    }

    const availableAircraft = await query.getMany();

    const results = [];

    for (const aircraft of availableAircraft) {
      // Check if aircraft is available for the requested time period
      const isAvailable = await this.checkAircraftAvailability(
        aircraft.id,
        departureDate,
        returnDate,
        tripType
      );

      if (isAvailable) {
        // Calculate pricing
        const pricing = await this.calculatePricing(
          aircraft,
          origin,
          destination,
          departureDate,
          returnDate,
          tripType
        );

        // Calculate distance priority
        const priority = this.calculateLocationPriority(aircraft, origin);

        results.push({
          id: aircraft.id,
          name: aircraft.name,
          model: aircraft.model,
          capacity: aircraft.capacity,
          pricePerHour: aircraft.pricePerHour,
          baseAirport: aircraft.baseAirport,
          baseCity: aircraft.baseCity,
          companyName: aircraft.company?.companyName || 'Unknown',
          imageUrl: aircraft.images?.[0]?.url || null,
          ...pricing,
          priority,
        });
      }
    }

    // Sort by priority (same city first, then by distance, then by price)
    return results.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.totalPrice - b.totalPrice;
    });
  }

  private async checkAircraftAvailability(
    aircraftId: number,
    departureDate: Date,
    returnDate: Date | null,
    tripType: string
  ): Promise<boolean> {
    const startDate = departureDate;
    const endDate = returnDate || departureDate;

    // Check for conflicting calendar entries
    const conflicts = await this.aircraftCalendarRepository
      .createQueryBuilder('calendar')
      .where('calendar.aircraftId = :aircraftId', { aircraftId })
      .andWhere('calendar.eventType IN (:...blockingEvents)', {
        blockingEvents: [CalendarEventType.BOOKED, CalendarEventType.MAINTENANCE, CalendarEventType.BLOCKED]
      })
      .andWhere(
        '(calendar.startDateTime <= :endDate AND calendar.endDateTime >= :startDate)',
        { startDate, endDate }
      )
      .getCount();

    return conflicts === 0;
  }

  private async calculatePricing(
    aircraft: Aircraft,
    origin: string,
    destination: string,
    departureDate: Date,
    returnDate: Date | null,
    tripType: string
  ) {
    const basePricePerHour = parseFloat(aircraft.pricePerHour.toString());

    // Calculate flight duration using NM and cruise speed in knots (fallback to estimate)
    const flightDurationHours = await this.computeDurationHours(origin, destination, aircraft);
    
    // Calculate repositioning cost if aircraft needs to move
    const repositioningCost = this.calculateRepositioningCost(aircraft, origin);
    
    let totalHours = flightDurationHours;
    let totalPrice = basePricePerHour * flightDurationHours;

    if (tripType === 'roundtrip' && returnDate) {
      const returnDurationHours = await this.computeDurationHours(destination, origin, aircraft);
      totalHours += returnDurationHours;
      totalPrice += basePricePerHour * returnDurationHours;
    }

    totalPrice += repositioningCost;

    return {
      totalPrice: Math.round(totalPrice * 100) / 100,
      pricePerHour: basePricePerHour,
      repositioningCost: Math.round(repositioningCost * 100) / 100,
      flightDurationHours: Math.round(flightDurationHours * 10) / 10,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  }

  private estimateFlightDuration(origin: string, destination: string): number {
    // Legacy fallback: simplified estimate
    return 2.5;
  }

  // Convert kilometers to nautical miles
  private kmToNm(km: number): number {
    return km / 1.852;
  }

  // Compute duration in hours using nautical miles and cruise speed in knots
  private async computeDurationHours(origin: string, destination: string, aircraft: Aircraft): Promise<number> {
    try {
      // Resolve coordinates
      const [originCoords, destCoords] = await Promise.all([
        this.getLocationCoordinates(origin),
        this.getLocationCoordinates(destination),
      ]);

      if (!originCoords || !destCoords) {
        return this.estimateFlightDuration(origin, destination);
      }

      // Calculate great-circle distance in km using Google service
      const distanceKm = this.googleEarthEngineService.calculateFlightDistance(
        originCoords.lat,
        originCoords.lng,
        destCoords.lat,
        destCoords.lng,
      );

      // Convert to nautical miles
      const distanceNm = this.kmToNm(distanceKm);

      // Use cruise speed in knots if available
      const speedKnots = aircraft.cruiseSpeedKnots || 0;
      if (speedKnots > 0 && distanceNm > 0) {
        const hours = distanceNm / speedKnots;
        // Enforce a reasonable minimum (0.5h) to avoid zero-duration; business can adjust later
        return Math.max(hours, 0.5);
      }

      // Fallback to legacy estimate
      return this.estimateFlightDuration(origin, destination);
    } catch (e) {
      return this.estimateFlightDuration(origin, destination);
    }
  }

  private calculateRepositioningCost(aircraft: Aircraft, origin: string): number {
    // If aircraft is already at origin, no repositioning cost
    if (aircraft.baseCity?.toLowerCase() === origin.toLowerCase()) {
      return 0;
    }

    // Simplified repositioning cost calculation
    // In a real implementation, you'd calculate actual distance and costs
    const basePricePerHour = parseFloat(aircraft.pricePerHour.toString());
    return basePricePerHour * 0.5; // 50% of hourly rate for repositioning
  }

  private calculateLocationPriority(aircraft: Aircraft, origin: string): number {
    const aircraftCity = aircraft.baseCity?.toLowerCase();
    const originCity = origin.toLowerCase();

    if (aircraftCity === originCity) {
      return 1; // Same city - highest priority
    }

    // You could add more sophisticated distance calculations here
    // For now, we'll use a simple approach
    return 2; // Different city - lower priority
  }

  async bookDirectCharter(bookDto: BookDirectCharterDto, userId: string) {
    console.log('=== BACKEND SERVICE: BOOK DIRECT CHARTER ===');
    console.log('User ID:', userId);
    console.log('Booking DTO:', JSON.stringify(bookDto, null, 2));
    
    const { aircraftId, departureDateTime, returnDateTime, tripType, passengers } = bookDto;

    // Use query runner for transaction with proper locking
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    console.log('=== BACKEND SERVICE: TRANSACTION STARTED ===');

    try {
      console.log('=== BACKEND SERVICE: CHECKING AIRCRAFT AVAILABILITY ===');
      console.log('Aircraft ID:', aircraftId);
      console.log('Departure DateTime:', departureDateTime);
      console.log('Return DateTime:', returnDateTime);
      
      // For direct charters, check if aircraft slot is already booked (exclusive booking)
      // Use SELECT FOR UPDATE to prevent race conditions
      const existingBooking = await queryRunner.manager.findOne(Booking, {
        where: {
          aircraftId: aircraftId,
          bookingStatus: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
          departureDateTime: Between(
            new Date(departureDateTime),
            returnDateTime ? new Date(returnDateTime) : new Date(departureDateTime)
          ),
        },
        lock: { mode: 'pessimistic_write' },
      });

      console.log('Existing Booking Check Result:', existingBooking ? 'FOUND CONFLICT' : 'NO CONFLICT');

      if (existingBooking) {
        console.log('ERROR: Aircraft slot conflict detected');
        throw new BadRequestException('Aircraft slot is already booked for the selected time period');
      }

      // Get aircraft details to get company ID with lock
      console.log('=== BACKEND SERVICE: FETCHING AIRCRAFT DETAILS ===');
      const aircraft = await queryRunner.manager.findOne(Aircraft, {
        where: { id: aircraftId },
        relations: ['company'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!aircraft) {
        console.log('ERROR: Aircraft not found');
        throw new NotFoundException(`Aircraft with ID ${aircraftId} not found`);
      }
      
      console.log('Aircraft Found:', {
        id: aircraft.id,
        name: aircraft.name,
        companyId: aircraft.company?.id,
        companyName: aircraft.company?.companyName
      });

      // Validate passengers before proceeding
      console.log('=== BACKEND SERVICE: VALIDATING PASSENGERS ===');
      this.passengerValidationService.validatePassengerRequirements(
        passengers,
        bookDto.origin,
        bookDto.destination,
        bookDto.passengerCount
      );

      // Validate passenger count against aircraft capacity
      this.passengerValidationService.validatePassengerCapacity(
        passengers.length,
        aircraft.capacity
      );

      // Get user data for passenger creation
      console.log('=== BACKEND SERVICE: FETCHING USER DETAILS ===');
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        select: ['id', 'first_name', 'last_name', 'nationality', 'date_of_birth']
      });

      if (!user) {
        console.log('ERROR: User not found');
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      
      console.log('User Found:', {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name
      });
      // Generate unique booking ID
      console.log('=== BACKEND SERVICE: GENERATING REFERENCE NUMBERS ===');
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      const random = Math.random().toString(36).substr(2, 3).toUpperCase();
      const bookingId = `BK-${timestamp}-${time}-${random}`;
      const referenceNumber = `AC${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      console.log('Generated Booking ID:', bookingId);
      console.log('Generated Reference Number:', referenceNumber);

      // Get coordinates for origin and destination
      const [originCoords, destinationCoords] = await Promise.all([
        this.getLocationCoordinates(bookDto.origin),
        this.getLocationCoordinates(bookDto.destination)
      ]);

      // Compute distance (km->NM) and duration for persistence
      let distanceNm: number | null = null;
      let estimatedFlightHours: number | null = null;
      let estimatedArrivalTime: Date | null = null;

      try {
        if (originCoords && destinationCoords) {
          const distanceKm = this.googleEarthEngineService.calculateFlightDistance(
            originCoords.lat,
            originCoords.lng,
            destinationCoords.lat,
            destinationCoords.lng,
          );
          distanceNm = Math.round(this.kmToNm(distanceKm) * 100) / 100;
        }
        // Use same duration logic used for pricing
        const duration = await this.computeDurationHours(bookDto.origin, bookDto.destination, aircraft);
        estimatedFlightHours = Math.round(duration * 100) / 100;
        const dep = new Date(bookDto.departureDateTime);
        estimatedArrivalTime = new Date(dep.getTime() + (duration * 3600 * 1000));
      } catch (e) {
        // Leave as nulls if any error
      }

      // Create booking - align with database schema
      console.log('=== BACKEND SERVICE: CREATING BOOKING RECORD ===');
      const now = new Date();
      const booking = this.bookingRepository.create({
        userId: userId,
        dealId: null, // Direct charter doesn't use deals
        companyId: aircraft.company?.id || 1,
        aircraftId: bookDto.aircraftId, // Add aircraft ID for direct bookings
        bookingType: BookingType.DIRECT,
        totalPrice: bookDto.totalPrice,
        bookingStatus: BookingStatus.PENDING, // Start as pending, will be confirmed after payment
        paymentStatus: PaymentStatus.PENDING,
        referenceNumber: referenceNumber,
        specialRequirements: bookDto.specialRequests,
        // Flight details - populate from DTO
        originName: bookDto.origin,
        destinationName: bookDto.destination,
        departureDateTime: new Date(bookDto.departureDateTime),
        estimatedFlightHours: estimatedFlightHours ?? null,
        estimatedArrivalTime: estimatedArrivalTime ?? null,
        // Coordinates from Google service
        originLatitude: originCoords?.lat || null,
        originLongitude: originCoords?.lng || null,
        destinationLatitude: destinationCoords?.lat || null,
        destinationLongitude: destinationCoords?.lng || null,
        distanceNm: distanceNm ?? null,
        // Passenger counts
        totalAdults: bookDto.passengerCount, // Use actual passenger count
        totalChildren: 0, // Could be calculated from passenger ages if provided
        onboardDining: false, // Default to false, could be added to DTO if needed
        createdAt: now, // Manually set timestamp
        updatedAt: now, // Manually set timestamp
      });

      console.log('Booking Object Created:', {
        userId: booking.userId,
        companyId: booking.companyId,
        aircraftId: booking.aircraftId,
        totalPrice: booking.totalPrice,
        referenceNumber: booking.referenceNumber,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus
      });

      const savedBookingArr = await queryRunner.manager.save(booking);
      const savedBooking = Array.isArray(savedBookingArr) ? savedBookingArr[0] : savedBookingArr;
      
      console.log('Booking Saved Successfully:', {
        id: savedBooking.id,
        referenceNumber: savedBooking.referenceNumber,
        bookingStatus: savedBooking.bookingStatus
      });

      // Create passenger records for all passengers
      console.log('=== BACKEND SERVICE: CREATING PASSENGER RECORDS ===');
      const savedPassengers = [];
      
      for (let i = 0; i < passengers.length; i++) {
        const passengerDto = passengers[i];
        console.log(`Creating passenger ${i + 1}:`, passengerDto);
        
        const passengerData = this.passengerValidationService.formatPassengerForDatabase(
          passengerDto, 
          savedBooking.id
        );
        
        const passenger = this.passengerRepository.create(passengerData);
        
        console.log('Passenger Object Created:', {
          bookingId: passenger.booking_id,
          firstName: passenger.first_name,
          lastName: passenger.last_name,
          age: passenger.age,
          nationality: passenger.nationality,
          isUser: passenger.is_user
        });

        const savedPassenger = await queryRunner.manager.save(passenger);
        savedPassengers.push(savedPassenger);
        
        console.log(`Passenger ${i + 1} Saved Successfully:`, {
          id: savedPassenger.id,
          bookingId: savedPassenger.booking_id,
          fullName: `${savedPassenger.first_name} ${savedPassenger.last_name}`,
          isUser: savedPassenger.is_user
        });
      }
      
      console.log(`All ${savedPassengers.length} passengers created successfully`);

      // Create booking stops if provided
      if (bookDto.stops && bookDto.stops.length > 0) {
        console.log('=== BACKEND SERVICE: CREATING BOOKING STOPS ===');
        console.log(`Creating ${bookDto.stops.length} stops for booking ${savedBooking.id}`);
        
        const savedStops = [];
        for (let i = 0; i < bookDto.stops.length; i++) {
          const stopDto = bookDto.stops[i];
          console.log(`Creating stop ${i + 1}:`, stopDto);
          
          const stopData = {
            bookingId: savedBooking.id,
            stopName: stopDto.stopName,
            longitude: stopDto.longitude,
            latitude: stopDto.latitude,
            datetime: stopDto.datetime ? new Date(stopDto.datetime) : null,
            stopOrder: stopDto.stopOrder || (i + 1),
            locationType: stopDto.locationType || LocationType.CUSTOM,
            locationCode: stopDto.locationCode || null,
          };
          
          const bookingStop = this.bookingStopRepository.create(stopData);
          const savedStop = await queryRunner.manager.save(bookingStop);
          savedStops.push(savedStop);
          
          console.log(`Stop ${i + 1} Saved Successfully:`, {
            id: savedStop.id,
            bookingId: savedStop.bookingId,
            stopName: savedStop.stopName,
            stopOrder: savedStop.stopOrder,
            locationType: savedStop.locationType
          });
        }
        
        console.log(`All ${savedStops.length} stops created successfully`);
      } else {
        console.log('No stops provided for this booking');
      }

      // Create calendar entry for the booking
      const calendarEntry = this.aircraftCalendarRepository.create({
        aircraftId: bookDto.aircraftId,
        companyId: aircraft.company?.id || 1,
        startDateTime: new Date(departureDateTime),
        endDateTime: returnDateTime ? new Date(returnDateTime) : new Date(departureDateTime),
        eventType: CalendarEventType.BOOKED,
        bookingId: savedBooking.id.toString(),
        originAirport: bookDto.origin,
        destinationAirport: bookDto.destination,
        passengerCount: bookDto.passengerCount,
        totalPrice: bookDto.totalPrice,
        pricePerHour: bookDto.pricePerHour,
        repositioningCost: bookDto.repositioningCost,
      });

      await queryRunner.manager.save(calendarEntry);

      // Create payment intent INSIDE transaction if totalPrice > 0 (not an inquiry)
      let paymentIntent = null;
      if (bookDto.totalPrice > 0) {
        try {
          paymentIntent = await this.paymentProviderService.createPaymentIntent({
            amount: bookDto.totalPrice,
            currency: 'USD',
            bookingId: savedBooking.id.toString(),
            userId: userId,
            description: `Payment for direct charter booking ${referenceNumber}`,
            metadata: {
              bookingId: savedBooking.id.toString(),
              referenceNumber: referenceNumber,
              dealId: 0, // Direct charter doesn't use deals
              company_id: aircraft.company?.id || 1,
              bookingType: 'direct_charter',
              aircraftId: bookDto.aircraftId,
            },
          }, PaymentProviderType.PAYSTACK);
        } catch (error) {
          console.error('Failed to create payment intent for direct charter:', error);
          // If payment intent creation fails, rollback the entire transaction
          throw new BadRequestException(`Payment setup failed: ${error.message}`);
        }
      } else {
        console.log(`Skipping payment intent creation for inquiry (totalPrice: ${bookDto.totalPrice})`);
      }

      // Commit transaction only after all operations succeed
      console.log('=== BACKEND SERVICE: COMMITTING TRANSACTION ===');
      await queryRunner.commitTransaction();
      
      // Send notifications to charter company after successful booking creation
      try {
        await this.sendCharterBookingNotifications(savedBooking, aircraft, user);
      } catch (notificationError) {
        console.error('Failed to send charter booking notifications:', notificationError);
        // Don't fail the booking creation if notifications fail
      }
      
      console.log('=== BACKEND SERVICE: BOOKING COMPLETED SUCCESSFULLY ===');
      console.log('Final Booking Details:', {
        id: savedBooking.id,
        referenceNumber: referenceNumber,
        totalPrice: bookDto.totalPrice,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        companyId: aircraft.company?.id || 1
      });

      return {
        booking: {
          id: savedBooking.id,
          referenceNumber: referenceNumber,
          totalPrice: bookDto.totalPrice,
          bookingStatus: 'pending',
          paymentStatus: 'pending',
          companyId: aircraft.company?.id || 1,
          // Expose computed flight metrics
          distanceNm: distanceNm,
          estimatedFlightHours: estimatedFlightHours,
          estimatedArrivalTime: estimatedArrivalTime?.toISOString() || null,
        },
        paymentIntent: paymentIntent ? {
          id: paymentIntent.id,
          clientSecret: paymentIntent.clientSecret,
          status: paymentIntent.status,
          requiresAction: paymentIntent.requiresAction,
          nextAction: paymentIntent.nextAction,
        } : null,
        paymentInstructions: {
          amount: bookDto.totalPrice,
          currency: 'USD',
          paymentMethods: ['card', 'apple_pay', 'google_pay'],
          nextSteps: paymentIntent ? [
            'Complete payment using the client secret',
            'Confirm payment using /bookings/:id/pay',
          ] : [
            'Create payment intent using /payments/create-intent',
            'Complete payment with Stripe',
            'Process booking using /bookings/:id/pay',
          ],
          apiEndpoints: {
            createIntent: `/payments/create-intent`,
            confirmPayment: `/bookings/${savedBooking.id}/pay`,
            paymentStatus: paymentIntent ? `/payments/status/${paymentIntent.id}` : null,
          },
        },
        message: 'Direct charter booking created successfully. Please complete payment to confirm.',
      };
    } catch (error) {
      console.log('=== BACKEND SERVICE: BOOKING ERROR ===');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('Error Stack:', error.stack);
      console.log('Rolling back transaction...');
      
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      console.log('=== BACKEND SERVICE: RELEASING QUERY RUNNER ===');
      await queryRunner.release();
    }
  }

  async getAircraftTypes() {
    return await this.aircraftTypeImagePlaceholderRepository.find({
      order: { type: 'ASC' }
    });
  }

  async getAircraftByType(typeId?: number, userLocation?: string) {
    let query = this.aircraftRepository
      .createQueryBuilder('aircraft')
      .leftJoinAndSelect('aircraft.company', 'company')
      .leftJoinAndSelect('aircraft.images', 'images')
      .leftJoinAndSelect('aircraft.aircraftTypeImagePlaceholder', 'aircraftType')
      .where('aircraft.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' })
      .andWhere('company.status = :companyStatus', { companyStatus: 'active' });

    if (typeId) {
      query = query.andWhere('aircraft.aircraftTypeImagePlaceholderId = :typeId', { typeId });
    }

    const aircraft = await query.getMany();

    return aircraft.map(aircraft => ({
      id: aircraft.id,
      name: aircraft.name,
      model: aircraft.model,
      capacity: aircraft.capacity,
      pricePerHour: aircraft.pricePerHour,
      baseAirport: aircraft.baseAirport,
      baseCity: aircraft.baseCity,
      companyId: aircraft.company?.id || null,
      companyName: aircraft.company?.companyName || 'Unknown',
      imageUrl: aircraft.images?.[0]?.url || aircraft.aircraftTypeImagePlaceholder?.placeholderImageUrl || null,
      aircraftType: aircraft.aircraftTypeImagePlaceholder?.type || 'unknown',
      flightDurationHours: this.estimateFlightDuration(aircraft.baseCity || 'Nairobi', userLocation || 'Nairobi'), // Calculate from user location
    }));
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Helper method to get coordinates for a location using Google service
  private async getLocationCoordinates(locationName: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // Search for the location using Google Places API
      const searchResults = await this.googleEarthEngineService.searchLocations({
        query: locationName,
        type: 'airport', // Prioritize airports for flight routes
      });
      
      if (searchResults.length > 0) {
        return searchResults[0].location;
      }
      
      // If no airport found, try a broader search
      const broaderResults = await this.googleEarthEngineService.searchLocations({
        query: locationName,
      });
      
      if (broaderResults.length > 0) {
        return broaderResults[0].location;
      }
      
      return null;
    } catch (error) {
      // Log the error but don't let it break the entire request
      console.error(`Error getting coordinates for ${locationName}:`, error);
      // Return null to indicate coordinates couldn't be found, but don't throw
      return null;
    }
  }

  /**
   * Get booked dates for a specific aircraft
   */
  async getBookedDates(
    aircraftId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Date[]> {
    try {
      const queryBuilder = this.bookingRepository
        .createQueryBuilder('booking')
        .select('booking.departureDateTime')
        .where('booking.aircraftId = :aircraftId', { aircraftId })
        .andWhere('booking.bookingStatus IN (:...statuses)', {
          statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        });

      if (startDate) {
        queryBuilder.andWhere('booking.departureDateTime >= :startDate', {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder.andWhere('booking.departureDateTime <= :endDate', {
          endDate,
        });
      }

      const results = await queryBuilder.getMany();
      
      // Extract unique dates (without time)
      const bookedDates = new Set<string>();
      results.forEach(booking => {
        const date = new Date(booking.departureDateTime);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        bookedDates.add(dateString);
      });

      return Array.from(bookedDates).map(dateString => new Date(dateString));
    } catch (error) {
      console.error('Error fetching booked dates:', error);
      throw new Error('Failed to fetch booked dates');
    }
  }

  private async sendCharterBookingNotifications(
    booking: Booking,
    aircraft: Aircraft,
    user: User
  ): Promise<void> {
    try {
      // Get charter company details
      const company = await this.companyRepository.findOne({
        where: { id: aircraft.companyId }
      });

      if (!company) {
        console.error('Charter company not found for aircraft:', aircraft.id);
        return;
      }

      const bookingData = {
        referenceNumber: booking.referenceNumber,
        customerName: `${user.first_name} ${user.last_name}`,
        customerEmail: user.email,
        aircraftName: aircraft.name,
        aircraftType: aircraft.type,
        origin: booking.originName,
        destination: booking.destinationName,
        departureDate: booking.departureDateTime.toLocaleString(),
        requestedSeats: booking.totalAdults + booking.totalChildren,
        specialRequirements: booking.specialRequirements,
        totalPrice: booking.totalPrice,
        createdAt: booking.createdAt.toLocaleString(),
        passengers: [], // Could be populated from passenger records if needed
      };

      // Send email notification
      if (this.emailService && company.email) {
        await this.emailService.sendInquiryNotificationEmail(company.email, bookingData);
      }

      // Send SMS notification
      if (this.smsService && company.mobileNumber) {
        await this.smsService.sendInquiryNotificationSms(company.mobileNumber, {
          referenceNumber: booking.referenceNumber,
          customerName: bookingData.customerName,
          aircraftName: aircraft.name,
          requestedSeats: bookingData.requestedSeats,
        });
      }

      console.log(`Charter booking notifications sent for ${booking.referenceNumber} to company ${company.companyName}`);
    } catch (error) {
      console.error('Error sending charter booking notifications:', error);
      throw error;
    }
  }
}
function andWhere(arg0: string, arg1: { companyStatus: string; }) {
  throw new Error('Function not implemented.');
}

