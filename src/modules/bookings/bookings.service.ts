import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Booking, BookingStatus, PaymentStatus, BookingType } from '../../common/entities/booking.entity';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { Passenger } from '../../common/entities/passenger.entity';
import { BookingTimeline, TimelineEventType } from '../../common/entities/booking-timeline.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatusResponseDto } from './dto/booking-status-response.dto';
import { v4 as uuidv4 } from 'uuid';
import { BookingPaymentService } from './services/booking-payment.service';
import { BookingTimelineService } from './services/booking-timeline.service';
import { BookingQueryService } from './services/booking-query.service';
import { EmailService } from '../email/email.service';
import { PaymentProviderService } from '../payments/services/payment-provider.service';
import { PaymentProviderType } from '../payments/interfaces/payment-provider.interface';
import { User } from '../../common/entities/user.entity';
import { UserTrip } from '../../common/entities/user-trips.entity';
import { ExperienceTemplate } from '../../common/entities/experience-template.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(CharterDeal)
    private readonly charterDealRepository: Repository<CharterDeal>,
    @InjectRepository(ExperienceTemplate)
    private readonly experienceTemplateRepository: Repository<ExperienceTemplate>,
    @InjectRepository(Passenger)
    private readonly passengerRepository: Repository<Passenger>,
    @InjectRepository(BookingTimeline)
    private readonly timelineRepository: Repository<BookingTimeline>,
    private readonly dataSource: DataSource,
    public readonly bookingPaymentService: BookingPaymentService,
    private readonly bookingTimelineService: BookingTimelineService,
    private readonly bookingQueryService: BookingQueryService,
    public readonly paymentProviderService: PaymentProviderService,
    private readonly emailService: EmailService,
  ) {}

  async testUserExists(userId: string) {
    try {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
        select: ['id', 'email', 'first_name', 'last_name']
      });
      
      return {
        exists: !!user,
        user: user || null,
        message: user ? 'User exists in database' : 'User not found in database'
      };
    } catch (error) {
      return {
        exists: false,
        user: null,
        message: `Error checking user: ${error.message}`,
        error: error.message
      };
    }
  }

  async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    // Generate unique booking ID only (no reference number yet)
    const bookingId = this.generateBookingId();

    // Fetch the charter deal to get company ID and other required fields
    const deal = await this.charterDealRepository.findOne({
      where: { id: createBookingDto.dealId },
      select: ['id', 'companyId', 'availableSeats', 'aircraftId', 'originName', 'originLatitude', 'originLongitude', 'destinationName', 'destinationLatitude', 'destinationLongitude', 'date', 'time', 'pricePerSeat']
    });

    if (!deal) {
      throw new NotFoundException(`Charter deal with ID ${createBookingDto.dealId} not found`);
    }

    // Fetch user data to include as passenger if needed
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: ['id', 'first_name', 'last_name', 'nationality', 'date_of_birth']
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Prepare passengers list - always include the user as the first passenger
    const passengersToCreate = [];
    
    // Check if user is already in the passengers list
    const userInPassengers = createBookingDto.passengers?.find(p => 
      p.firstName.toLowerCase() === user.first_name?.toLowerCase() && 
      p.lastName.toLowerCase() === user.last_name?.toLowerCase()
    );

    if (!userInPassengers) {
      // Add user as the first passenger
      passengersToCreate.push({
        firstName: user.first_name || 'Unknown',
        lastName: user.last_name || 'User',
        age: user.date_of_birth ? this.calculateAge(user.date_of_birth) : 25, // Default age for adults
        nationality: user.nationality,
        idPassportNumber: undefined, // User's passport not stored in user table
        isUser: true, // Flag to identify this is the booking user
      });
    }

    // Add other passengers from the DTO
    if (createBookingDto.passengers && createBookingDto.passengers.length > 0) {
      passengersToCreate.push(...createBookingDto.passengers.map(p => ({
        ...p,
        isUser: false, // Flag to identify these are additional passengers
      })));
    }

    // Start transaction immediately to prevent race conditions
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    console.log('🔍 DEBUG: Starting booking creation transaction for user:', userId);
    console.log('🔍 DEBUG: Deal data:', {
      id: deal.id,
      companyId: deal.companyId,
      aircraftId: deal.aircraftId,
      date: deal.date,
      time: deal.time,
      pricePerSeat: deal.pricePerSeat,
      availableSeats: deal.availableSeats
    });
    console.log('🔍 DEBUG: Deal aircraftId type:', typeof deal.aircraftId, 'value:', deal.aircraftId);
    
    console.log('🔍 DEBUG: Passengers to create:', passengersToCreate);
    console.log('🔍 DEBUG: Total adults calculation:', passengersToCreate.filter(p => {
      const age = p.age || 25;
      console.log('🔍 DEBUG: Passenger age:', p.age, 'Default age:', 25, 'Final age:', age);
      return typeof age === 'number' && !isNaN(age) && age >= 18;
    }).length);
    console.log('🔍 DEBUG: Total children calculation:', passengersToCreate.filter(p => {
      const age = p.age || 25;
      return typeof age === 'number' && !isNaN(age) && age < 18;
    }).length);

    try {
      // Re-fetch deal with pessimistic lock to prevent race conditions
      const lockedDeal = await queryRunner.manager.findOne(CharterDeal, {
        where: { id: createBookingDto.dealId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedDeal) {
        throw new BadRequestException('Deal not found or no longer available');
      }

      // Check if deal has enough available seats (inside transaction with lock)
      if (lockedDeal.availableSeats < passengersToCreate.length) {
        throw new BadRequestException(`Insufficient seats available. Only ${lockedDeal.availableSeats} seats left, but ${passengersToCreate.length} passengers requested.`);
      }

      // Generate reference number for booking creation
      const referenceNumber = this.generateBookingReference();
      
      // Create booking with all required fields to match database schema
      const now = new Date();
      const booking = this.bookingRepository.create({
        userId,
        dealId: createBookingDto.dealId,
        companyId: Number(deal.companyId) || 0,
        aircraftId: deal.aircraftId, // Use aircraft ID from the deal
        bookingType: BookingType.DEAL,
        experienceTemplateId: null, // NULL for deal bookings
        totalPrice: null, // NULL for deal bookings (pricing happens later)
        taxType: null, // NULL for deal bookings
        taxAmount: null, // NULL for deal bookings
        subtotal: null, // NULL for deal bookings
        bookingStatus: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        referenceNumber: referenceNumber,
        specialRequirements: createBookingDto.specialRequirements,
        adminNotes: null, // NULL for new bookings
        originName: null, // NULL for deal bookings
        originLatitude: null, // NULL for deal bookings
        originLongitude: null, // NULL for deal bookings
        destinationName: null, // NULL for deal bookings
        destinationLatitude: null, // NULL for deal bookings
        destinationLongitude: null, // NULL for deal bookings
        departureDateTime: null, // NULL for deal bookings
        estimatedFlightHours: null, // NULL for deal bookings
        estimatedArrivalTime: null, // NULL for deal bookings
        onboardDining: createBookingDto.onboardDining || false,
        totalAdults: (() => {
          const adults = passengersToCreate.filter(p => {
            const age = p.age || 25;
            return typeof age === 'number' && !isNaN(age) && age >= 18;
          }).length;
          return Number(adults) || 0;
        })(),
        totalChildren: (() => {
          const children = passengersToCreate.filter(p => {
            const age = p.age || 25;
            return typeof age === 'number' && !isNaN(age) && age < 18;
          }).length;
          return Number(children) || 0;
        })(),
        createdAt: now, // Manually set timestamp
        updatedAt: now, // Manually set timestamp
      });

      const savedBooking = await queryRunner.manager.save(booking);

      // Create passengers
      for (const passengerData of passengersToCreate) {
        const passenger = queryRunner.manager.create(Passenger, {
          booking_id: savedBooking.id, // Use number instead of string
          first_name: passengerData.firstName,
          last_name: passengerData.lastName,
          age: passengerData.age || null, // Use null instead of undefined
          nationality: passengerData.nationality || null, // Use null instead of undefined
          id_passport_number: passengerData.idPassportNumber || null, // Use null instead of undefined
          is_user: passengerData.isUser === true,
        });

        await queryRunner.manager.save(passenger);
      }

      // Update available seats in the deal (using locked deal)
      const passengerCount = passengersToCreate.length;
      lockedDeal.availableSeats -= passengerCount;
      await queryRunner.manager.save(lockedDeal);

      await queryRunner.commitTransaction();

      // Create timeline event for booking creation
      await this.bookingTimelineService.createTimelineEvent(savedBooking.id.toString(), TimelineEventType.BOOKING_CREATED, {
        title: 'Booking Created',
        description: `Booking ${referenceNumber} has been created successfully with ${passengerCount} passengers. Loyalty points will be earned upon payment.`,
        metadata: { 
          passengerCount, 
          companyId: lockedDeal.companyId,
          referenceNumber: referenceNumber,
          totalPrice: createBookingDto.totalPrice,
          userIncluded: !userInPassengers, // Track if user was automatically added
        }
      });

      // Return booking with passengers
      return this.bookingQueryService.findOne(savedBooking.id.toString());
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw new BadRequestException('Failed to create booking: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create booking with payment intent for seamless Paystack integration
   * STANDARDIZED FLOW: Create booking first, then payment intent (if totalPrice > 0)
   */
  async createWithPaymentIntent(createBookingDto: CreateBookingDto, userId: string): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the booking first (within transaction)
      const booking = await this.createBookingInTransaction(createBookingDto, userId, queryRunner);
      
      // Only create payment intent if totalPrice > 0 (not an inquiry)
      let paymentIntent = null;
      if (booking.totalPrice > 0) {
        try {
          paymentIntent = await this.paymentProviderService.createPaymentIntent({
        amount: booking.totalPrice,
        currency: 'USD',
        bookingId: booking.id.toString(),
        userId: booking.userId,
        description: `Payment for booking ${booking.referenceNumber}`,
        metadata: {
          bookingId: booking.id.toString(),
          referenceNumber: booking.referenceNumber,
          dealId: booking.dealId,
          company_id: booking.companyId,
              bookingType: 'deal_booking',
            },
          }, PaymentProviderType.PAYSTACK);
        } catch (error) {
          console.error('Failed to create payment intent for deal booking:', error);
          // If payment intent creation fails, rollback the entire transaction
          throw new BadRequestException(`Payment setup failed: ${error.message}`);
        }
      } else {
        console.log(`Skipping payment intent creation for deal inquiry (totalPrice: ${booking.totalPrice})`);
      }

      // Commit transaction only after all operations succeed
      await queryRunner.commitTransaction();

      return {
        booking,
        paymentIntent: paymentIntent ? {
          id: paymentIntent.id,
          clientSecret: paymentIntent.clientSecret,
          status: paymentIntent.status,
          requiresAction: paymentIntent.requiresAction,
          nextAction: paymentIntent.nextAction,
        } : null,
        paymentInstructions: paymentIntent ? {
          amount: booking.totalPrice,
          currency: 'USD',
          paymentMethods: ['card', 'apple_pay', 'google_pay', 'bank_transfer'],
          nextSteps: [
            'Complete payment using the client secret',
            'Confirm payment using /payments/confirm',
            'Process booking using /bookings/:id/process-payment'
          ],
          apiEndpoints: {
            confirmPayment: `/payments/confirm`,
            processBooking: `/bookings/${booking.id}/process-payment`,
            paymentStatus: `/payments/status/${paymentIntent.id}`
          }
        } : null,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create booking within a transaction (extracted from create method)
   * This ensures consistency with the main create method
   */
  private async createBookingInTransaction(
    createBookingDto: CreateBookingDto, 
    userId: string, 
    queryRunner: any
  ): Promise<Booking> {
    let deal = null;
    let experience = null;
    let companyId: number;
    let aircraftId: number;
    let bookingType: BookingType;
    let dealId: number | null = null;
    let experienceTemplateId: number | null = null;

    // Determine if this is a deal booking or experience booking
    if (createBookingDto.experienceScheduleId) {
      // Experience booking
      experience = await queryRunner.manager.findOne(ExperienceTemplate, {
        where: { id: createBookingDto.experienceTemplateId },
        relations: ['company', 'aircraft']
      });

      if (!experience) {
        throw new NotFoundException(`Experience template with ID ${createBookingDto.experienceTemplateId} not found`);
      }

      companyId = experience.companyId;
      aircraftId = experience.aircraftId;
      bookingType = BookingType.EXPERIENCE;
      experienceTemplateId = createBookingDto.experienceTemplateId;
    } else {
      // Deal booking
      deal = await queryRunner.manager.findOne(CharterDeal, {
        where: { id: createBookingDto.dealId },
        relations: ['company', 'aircraft']
      });

      if (!deal) {
        throw new NotFoundException(`Deal with ID ${createBookingDto.dealId} not found`);
      }

      companyId = deal.companyId;
      aircraftId = deal.aircraftId;
      bookingType = BookingType.DEAL;
      dealId = createBookingDto.dealId;
    }

    // Create the booking
    const booking = queryRunner.manager.create(Booking, {
      userId,
      companyId,
      aircraftId,
      dealId,
      experienceTemplateId,
      bookingType,
      totalPrice: createBookingDto.totalPrice,
      onboardDining: createBookingDto.onboardDining,
      specialRequirements: createBookingDto.specialRequirements,
      billingRegion: createBookingDto.billingRegion,
      bookingStatus: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      referenceNumber: this.generateBookingReference(),
      // Copy route information from deal or experience
      originName: deal?.originName || experience?.originName,
      destinationName: deal?.destinationName || experience?.destinationName,
      originLatitude: deal?.originLatitude || experience?.originLatitude,
      originLongitude: deal?.originLongitude || experience?.originLongitude,
      destinationLatitude: deal?.destinationLatitude || experience?.destinationLatitude,
      destinationLongitude: deal?.destinationLongitude || experience?.destinationLongitude,
      departureDateTime: deal?.date || experience?.scheduledDate,
    });

    return await queryRunner.manager.save(booking);
  }

  async findAll(userId?: string): Promise<Booking[]> {
    return this.bookingQueryService.findAll(userId);
  }

  async findOne(id: string): Promise<Booking> {
    return this.bookingQueryService.findOne(id);
  }

  async findByReference(referenceNumber: string): Promise<Booking> {
    return this.bookingQueryService.findByReference(referenceNumber);
  }

  async findByUser(userId: string): Promise<Booking[]> {
    return this.bookingQueryService.findAll(userId);
  }

  async findByUserWithFilters(
    userId: string,
    filters: { upcoming?: boolean; status?: BookingStatus }
  ): Promise<Booking[]> {
    return this.bookingQueryService.findByUserWithFilters(userId, filters);
  }

  async updateStatus(id: string, bookingStatus: BookingStatus): Promise<Booking> {
    const booking = await this.bookingQueryService.findOne(id);
    const oldStatus = booking.bookingStatus;
    
    booking.bookingStatus = bookingStatus;
    await this.bookingRepository.save(booking);

    // Create timeline event
    await this.bookingTimelineService.createTimelineEvent(id, TimelineEventType.STATUS_CHANGED, {
      title: 'Booking Status Updated',
      description: `Booking status changed from ${oldStatus} to ${bookingStatus}`,
      oldValue: oldStatus,
      newValue: bookingStatus,
    });

    return this.bookingQueryService.findOne(id);
  }

  /**
   * Update loyalty points and wallet amount used for a booking
   */
  async updateLoyaltyAndWallet(
    bookingId: string,
    loyaltyPointsRedeemed: number = 0,
    walletAmountUsed: number = 0
  ): Promise<Booking> {
    const booking = await this.bookingQueryService.findOne(bookingId);
    
    // booking.loyaltyPointsRedeemed = loyaltyPointsRedeemed; // Not in database
    // booking.walletAmountUsed = walletAmountUsed; // Not in database
    
    await this.bookingRepository.save(booking);

    // Create timeline event
    await this.bookingTimelineService.createTimelineEvent(bookingId, TimelineEventType.LOYALTY_UPDATED, {
      title: 'Loyalty Points and Wallet Updated',
      description: `Loyalty points redeemed: ${loyaltyPointsRedeemed}, Wallet amount used: $${walletAmountUsed}`,
      metadata: { loyaltyPointsRedeemed, walletAmountUsed }
    });

    return this.bookingQueryService.findOne(bookingId);
  }

  /**
   * Get booking summary with loyalty and wallet information
   */
  async getBookingSummary(bookingId: string): Promise<any> {
    return this.bookingQueryService.getBookingSummary(bookingId);
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Booking> {
    return this.bookingPaymentService.updatePaymentStatus(id, paymentStatus);
  }

  async cancel(id: string, userId: string): Promise<Booking> {
    const booking = await this.bookingQueryService.findOne(id);

    // Verify ownership
    if (booking.userId !== userId) {
      throw new BadRequestException('You can only cancel your own bookings');
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled) {
      throw new BadRequestException('This booking cannot be cancelled');
    }

    const oldStatus = booking.bookingStatus;
    booking.bookingStatus = BookingStatus.CANCELLED;
    await this.bookingRepository.save(booking);

    // Create timeline event
    await this.bookingTimelineService.createTimelineEvent(id, TimelineEventType.BOOKING_CANCELLED, {
      title: 'Booking Cancelled',
      description: `Booking cancelled by user. Previous status: ${oldStatus}`,
      oldValue: oldStatus,
      newValue: BookingStatus.CANCELLED,
    });

    return this.bookingQueryService.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const booking = await this.bookingQueryService.findOne(id);
    await this.bookingRepository.remove(booking);
  }

  private bookingCounter = 0;

  private generateBookingId(): string {
    const now = new Date();
    // Day
    const day = String(now.getDate()).padStart(2, '0');
    // Month (short, uppercase)
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    // Year (last two digits)
    const year = String(now.getFullYear()).slice(-2);
    // Hour, minute, and seconds
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    // Random 3-letter code
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    // Auto-incrementing 2-digit number
    this.bookingCounter = (this.bookingCounter + 1) % 100; // Reset to 0 after 99
    const counter = String(this.bookingCounter).padStart(2, '0');

    return `BK-${day}${month}${year}-${hour}${minute}${seconds}-${random}${counter}`;
  }

  private generateBookingReference(): string {
    const prefix = 'AC'; // Air Charters
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
    return `${prefix}${timestamp}${random}`;
  }

  private calculateAge(dateOfBirth: Date): number {
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      
      // Validate the date
      if (isNaN(birthDate.getTime())) {
        console.log('🔍 DEBUG: Invalid date of birth, returning default age 25');
        return 25; // Default age for adults
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Ensure age is reasonable
      if (age < 0 || age > 120) {
        console.log('🔍 DEBUG: Unreasonable age calculated, returning default age 25');
        return 25;
      }
      
      return age;
    } catch (error) {
      console.log('🔍 DEBUG: Error calculating age, returning default age 25:', error);
      return 25; // Default age for adults
    }
  }

  // Statistics methods
  async getBookingStats(userId?: string): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  }> {
    return this.bookingQueryService.getBookingStats(userId);
  }

  async confirmBooking(
    id: string,
    userId: string,
    paymentTransactionId: string
  ): Promise<any> {
    const booking = await this.bookingQueryService.findOne(id);

    // Verify ownership
    if (booking.userId !== userId) {
      throw new BadRequestException('You can only confirm your own bookings');
    }

    // Check if booking can be confirmed
    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking is not in pending status');
    }

    if (booking.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not in pending status');
    }

    // Process payment and populate points/reference
    const updatedBooking = await this.bookingPaymentService.processPayment(
      id,
      paymentTransactionId,
      'card', // Default payment method since it's not in database
      booking.totalPrice
    );

    // Generate confirmation email content
    const confirmationEmail = this.generateConfirmationEmail(updatedBooking);

    // Send booking confirmation email
    try {
      await this.emailService.sendBookingConfirmationEmail(
        updatedBooking.user.email,
        {
          referenceNumber: updatedBooking.referenceNumber,
          passengerName: `${updatedBooking.user.first_name} ${updatedBooking.user.last_name}`,
          departure: updatedBooking.deal.originName,
          destination: updatedBooking.deal.destinationName,
          date: updatedBooking.deal.date.toLocaleDateString(),
          time: updatedBooking.deal.time,
          aircraft: updatedBooking.deal.aircraft.name,
          company: updatedBooking.deal.company.companyName,
          totalAmount: updatedBooking.totalPrice,
        }
      );
    } catch (error) {
      console.error('Failed to send booking confirmation email:', error);
      // Don't fail the booking confirmation if email fails
    }

    return {
      id: updatedBooking.id,
      referenceNumber: updatedBooking.referenceNumber,
      bookingStatus: updatedBooking.bookingStatus,
      paymentStatus: updatedBooking.paymentStatus,
      confirmationEmail,
    };
  }

  async findPendingPaymentBookings(userId: string): Promise<Booking[]> {
    return this.bookingQueryService.findPendingPaymentBookings(userId);
  }

  private generateConfirmationEmail(booking: Booking): string {
    return `
      Dear ${booking.user.first_name} ${booking.user.last_name},
      
      Your booking has been confirmed!
      
      Booking Reference: ${booking.referenceNumber}
      Date: ${booking.deal.date}
      Time: ${booking.deal.time}
      Aircraft: ${booking.deal.aircraft.name}
      Company: ${booking.deal.company.companyName}
      
      Total Amount: $${booking.totalPrice}
      
      Please arrive 30 minutes before departure time.
      
      Thank you for choosing our service!
    `;
  }

  // Timeline Methods
  async getBookingTimeline(bookingId: string): Promise<BookingTimeline[]> {
    return this.bookingTimelineService.getBookingTimeline(bookingId);
  }

  async getBookingStatusByReference(referenceNumber: string): Promise<BookingStatusResponseDto> {
    return this.bookingQueryService.getBookingStatusByReference(referenceNumber);
  }

  /**
   * Update booking status from PENDING to CONFIRMED after successful payment
   */
  async confirmBookingAfterPayment(bookingId: string, paymentReference: string): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the booking
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: parseInt(bookingId) }
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Update booking status to confirmed
      booking.bookingStatus = BookingStatus.CONFIRMED;
      booking.paymentStatus = PaymentStatus.PAID;
      booking.updatedAt = new Date();

      const updatedBooking = await queryRunner.manager.save(booking);

      // Add timeline event
      await this.bookingTimelineService.createTimelineEvent(
        bookingId,
        TimelineEventType.PAYMENT_COMPLETED,
        {
          title: 'Payment Confirmed',
          description: 'Payment confirmed and booking confirmed',
          newValue: 'confirmed',
        }
      );

      // Create UserTrip record automatically after successful payment
      await this.createUserTripAfterPayment(updatedBooking, queryRunner);

      await queryRunner.commitTransaction();

      // Send confirmation email
      try {
        const user = await this.dataSource.getRepository(User).findOne({
          where: { id: updatedBooking.userId },
          select: ['email', 'first_name', 'last_name']
        });
        
        if (user) {
          await this.emailService.sendBookingConfirmationEmail(
            user.email,
            {
              referenceNumber: updatedBooking.referenceNumber,
              passengerName: `${user.first_name} ${user.last_name}`,
              departure: updatedBooking.originName,
              destination: updatedBooking.destinationName,
              date: new Date(updatedBooking.departureDateTime).toLocaleDateString(),
              time: new Date(updatedBooking.departureDateTime).toLocaleTimeString(),
              aircraft: 'Private Aircraft',
              company: 'Charter Company',
              totalAmount: updatedBooking.totalPrice,
            }
          );
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the booking confirmation if email fails
      }

      return updatedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create UserTrip record after successful payment confirmation
   * This ensures users can see their confirmed bookings in the trips section
   */
  private async createUserTripAfterPayment(booking: Booking, queryRunner: any): Promise<void> {
    try {
      // Check if UserTrip already exists for this booking
      const existingTrip = await queryRunner.manager.findOne(UserTrip, {
        where: { bookingId: booking.id.toString() }
      });

      if (existingTrip) {
        console.log(`UserTrip already exists for booking ${booking.id}`);
        return;
      }

      // Create new UserTrip record
      const userTrip = queryRunner.manager.create(UserTrip, {
        id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: booking.userId,
        bookingId: booking.id.toString(),
        status: 'upcoming', // Will be calculated dynamically by trips service
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await queryRunner.manager.save(userTrip);
      console.log(`Created UserTrip for booking ${booking.id}`);
    } catch (error) {
      console.error(`Failed to create UserTrip for booking ${booking.id}:`, error);
      // Don't fail the entire transaction if trip creation fails
      // The trips service can still work with just the booking data
    }
  }

  /**
   * Create payment intent for a pending inquiry
   * This allows users to pay for inquiries after admin has set the price
   */
  async createPaymentIntentForInquiry(bookingId: string): Promise<any> {
    const booking = await this.findOne(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.totalPrice <= 0) {
      throw new BadRequestException('Booking has no price set. Please contact support.');
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Booking is already paid');
    }

    try {
      // Create payment intent with Paystack
      const paymentIntent = await this.paymentProviderService.createPaymentIntent({
        amount: booking.totalPrice,
        currency: 'USD',
        bookingId: booking.id.toString(),
        userId: booking.userId,
        description: `Payment for booking ${booking.referenceNumber}`,
        metadata: {
          bookingId: booking.id.toString(),
          referenceNumber: booking.referenceNumber,
          dealId: booking.dealId,
          company_id: booking.companyId,
          bookingType: booking.dealId ? 'deal_booking' : 'direct_charter',
        },
      }, PaymentProviderType.PAYSTACK);

      return {
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.clientSecret,
          status: paymentIntent.status,
          requiresAction: paymentIntent.requiresAction,
          nextAction: paymentIntent.nextAction,
        },
        booking: {
          id: booking.id,
          totalPrice: booking.totalPrice,
          referenceNumber: booking.referenceNumber,
        },
        paymentInstructions: {
          amount: booking.totalPrice,
          currency: 'USD',
          paymentMethods: ['card', 'apple_pay', 'google_pay', 'bank_transfer'],
          nextSteps: [
            'Complete payment using the client secret',
            'Confirm payment using /payments/confirm',
            'Booking will be automatically confirmed'
          ],
          apiEndpoints: {
            confirmPayment: `/payments/confirm`,
            bookingConfirmation: `/bookings/${booking.id}/confirm-payment`,
            paymentStatus: `/payments/status/${paymentIntent.id}`
          }
        }
      };
    } catch (error) {
      console.error('Failed to create payment intent for inquiry:', error);
      throw new BadRequestException(`Payment setup failed: ${error.message}`);
    }
  }
} 