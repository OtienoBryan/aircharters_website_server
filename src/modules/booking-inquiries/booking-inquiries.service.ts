import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { BookingInquiry, InquiryStatus, ProposedPriceType } from '../../common/entities/booking-inquiry.entity';
import { InquiryStop } from '../../common/entities/inquiry-stop.entity';
import { BookingStop } from '../../common/entities/booking-stop.entity';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { User } from '../../common/entities/user.entity';
import { Booking, BookingStatus, PaymentStatus, BookingType } from '../../common/entities/booking.entity';
import { Payment } from '../../common/entities/payment.entity';
import { AircraftCalendar, CalendarEventType } from '../../common/entities/aircraft-calendar.entity';
import { CreateBookingInquiryDto } from './dto/create-booking-inquiry.dto';
import { UpdateBookingInquiryDto } from './dto/update-booking-inquiry.dto';
import { PaymentProviderService } from '../payments/services/payment-provider.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { ChartersCompany } from '../../common/entities/charters-company.entity';

@Injectable()
export class BookingInquiriesService {
  constructor(
    @InjectRepository(BookingInquiry)
    private bookingInquiryRepository: Repository<BookingInquiry>,
    @InjectRepository(InquiryStop)
    private inquiryStopRepository: Repository<InquiryStop>,
    @InjectRepository(BookingStop)
    private bookingStopRepository: Repository<BookingStop>,
    @InjectRepository(Aircraft)
    private aircraftRepository: Repository<Aircraft>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(AircraftCalendar)
    private aircraftCalendarRepository: Repository<AircraftCalendar>,
    @InjectRepository(ChartersCompany)
    private chartersCompanyRepository: Repository<ChartersCompany>,
    private dataSource: DataSource,
    private paymentProviderService?: PaymentProviderService,
    private emailService?: EmailService,
    private smsService?: SmsService,
  ) {}

  async create(createBookingInquiryDto: CreateBookingInquiryDto, userId: string): Promise<BookingInquiry> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate reference number
      const referenceNumber = this.generateReferenceNumber();

      // Get aircraft and user details
      const aircraft = await this.aircraftRepository.findOne({
        where: { id: createBookingInquiryDto.aircraftId }
      });

      if (!aircraft) {
        throw new NotFoundException('Aircraft not found');
      }

      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check aircraft availability for the requested dates if provided
      if (createBookingInquiryDto.preferredDepartureDate) {
        const isAvailable = await this.checkAircraftAvailabilityForInquiry(
          createBookingInquiryDto.aircraftId,
          new Date(createBookingInquiryDto.preferredDepartureDate),
          createBookingInquiryDto.preferredReturnDate ? new Date(createBookingInquiryDto.preferredReturnDate) : null
        );

        if (!isAvailable) {
          throw new BadRequestException('Aircraft is not available for the requested dates. Please select different dates or contact support for alternative options.');
        }
      }

      // Create the booking inquiry
      const bookingInquiry = this.bookingInquiryRepository.create({
        userId,
        aircraftId: createBookingInquiryDto.aircraftId,
        company_id: aircraft.companyId,
        requestedSeats: createBookingInquiryDto.requestedSeats,
        specialRequirements: createBookingInquiryDto.specialRequirements,
        onboardDining: createBookingInquiryDto.onboardDining || false,
        groundTransportation: createBookingInquiryDto.groundTransportation || false,
        billingRegion: createBookingInquiryDto.billingRegion,
        userNotes: createBookingInquiryDto.userNotes,
        referenceNumber,
      });

      const savedInquiry = await queryRunner.manager.save(bookingInquiry);

      // Create inquiry stops
      if (createBookingInquiryDto.stops && createBookingInquiryDto.stops.length > 0) {
        const stops = createBookingInquiryDto.stops.map(stopDto => 
          this.inquiryStopRepository.create({
            bookingInquiryId: savedInquiry.id,
            stopName: stopDto.stopName,
            longitude: stopDto.longitude,
            latitude: stopDto.latitude,
            price: stopDto.price,
            datetime: stopDto.datetime ? new Date(stopDto.datetime) : null,
            stopOrder: stopDto.stopOrder || 1,
            locationCode: stopDto.locationCode,
          })
        );

        await queryRunner.manager.save(stops);
      }

      await queryRunner.commitTransaction();

      // Send notifications to charter company
      try {
        await this.sendInquiryNotifications(savedInquiry, aircraft, user, createBookingInquiryDto);
      } catch (notificationError) {
        console.error('Failed to send inquiry notifications:', notificationError);
        // Don't fail the inquiry creation if notifications fail
      }

      // Return with relations
      return await this.findOne(savedInquiry.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId: string): Promise<BookingInquiry[]> {
    return await this.bookingInquiryRepository.find({
      where: { userId },
      relations: ['stops', 'aircraft', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<BookingInquiry> {
    const inquiry = await this.bookingInquiryRepository.findOne({
      where: { id },
      relations: ['stops', 'aircraft', 'user'],
    });

    if (!inquiry) {
      throw new NotFoundException(`Booking inquiry with ID ${id} not found`);
    }

    return inquiry;
  }

  async findByReference(referenceNumber: string): Promise<BookingInquiry> {
    const inquiry = await this.bookingInquiryRepository.findOne({
      where: { referenceNumber },
      relations: ['stops', 'aircraft', 'user'],
    });

    if (!inquiry) {
      throw new NotFoundException(`Booking inquiry with reference ${referenceNumber} not found`);
    }

    return inquiry;
  }

  async update(id: number, updateBookingInquiryDto: UpdateBookingInquiryDto): Promise<BookingInquiry> {
    const inquiry = await this.findOne(id);

    // Update inquiry status and pricing
    if (updateBookingInquiryDto.inquiryStatus === InquiryStatus.PRICED) {
      inquiry.inquiryStatus = InquiryStatus.PRICED;
      inquiry.proposedPrice = updateBookingInquiryDto.proposedPrice;
      inquiry.proposedPriceType = updateBookingInquiryDto.proposedPriceType;
      inquiry.adminNotes = updateBookingInquiryDto.adminNotes;
      inquiry.pricedAt = new Date();
    }

    return await this.bookingInquiryRepository.save(inquiry);
  }

  async confirmInquiry(id: number, userId: string): Promise<{ inquiry: BookingInquiry; paymentIntent?: any }> {
    const inquiry = await this.findOne(id);

    if (inquiry.userId !== userId) {
      throw new BadRequestException('You can only confirm your own inquiries');
    }

    if (inquiry.inquiryStatus !== InquiryStatus.PRICED) {
      throw new BadRequestException('Inquiry must be priced before confirmation');
    }

    if (!inquiry.proposedPrice) {
      throw new BadRequestException('Inquiry must have a proposed price');
    }

    // Update inquiry status
    inquiry.inquiryStatus = InquiryStatus.CONFIRMED;
    inquiry.confirmedAt = new Date();
    await this.bookingInquiryRepository.save(inquiry);

    // Create booking from inquiry
    const booking = await this.createBookingFromInquiry(inquiry);

    // Create payment intent only if payment provider is available
    let paymentIntent = null;
    if (this.paymentProviderService) {
      try {
        paymentIntent = await this.paymentProviderService.createPaymentIntent({
          amount: inquiry.proposedPrice * 100, // Convert to cents
          currency: 'USD',
          bookingId: booking.id.toString(),
          userId: inquiry.userId,
          description: `Payment for inquiry ${inquiry.referenceNumber}`,
          metadata: {
            inquiryId: inquiry.id,
            inquiryReference: inquiry.referenceNumber,
            aircraftId: inquiry.aircraftId,
            requestedSeats: inquiry.requestedSeats,
          },
        });
      } catch (error) {
        console.error('Failed to create payment intent:', error);
      }
    }

    return {
      inquiry,
      paymentIntent: paymentIntent ? {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        status: paymentIntent.status,
      } : null,
    };
  }

  async cancelInquiry(id: number, userId: string): Promise<BookingInquiry> {
    const inquiry = await this.findOne(id);

    if (inquiry.userId !== userId) {
      throw new BadRequestException('You can only cancel your own inquiries');
    }

    if (inquiry.inquiryStatus === InquiryStatus.CONFIRMED) {
      throw new BadRequestException('Cannot cancel confirmed inquiries');
    }

    inquiry.inquiryStatus = InquiryStatus.CANCELLED;
    inquiry.cancelledAt = new Date();

    return await this.bookingInquiryRepository.save(inquiry);
  }

  private async createBookingFromInquiry(inquiry: BookingInquiry): Promise<Booking> {
    const bookingId = `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    const booking = this.bookingRepository.create({
      userId: inquiry.userId,
      dealId: null, // No deal for inquiry-based bookings
      companyId: inquiry.company_id,
      bookingType: BookingType.DIRECT,
      totalPrice: inquiry.proposedPrice || 0,
      onboardDining: inquiry.onboardDining,
      referenceNumber: inquiry.referenceNumber,
      bookingStatus: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      specialRequirements: inquiry.specialRequirements,
      totalAdults: inquiry.requestedSeats,
      totalChildren: 0,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Create booking stops from inquiry stops
    if (inquiry.stops && inquiry.stops.length > 0) {
      const bookingStops = inquiry.stops.map(inquiryStop => 
        this.bookingStopRepository.create({
          bookingId: savedBooking.id,
          stopName: inquiryStop.stopName,
          longitude: inquiryStop.longitude,
          latitude: inquiryStop.latitude,
          datetime: inquiryStop.datetime,
          stopOrder: inquiryStop.stopOrder,
          locationType: inquiryStop.locationType,
          locationCode: inquiryStop.locationCode,
        })
      );

      await this.bookingStopRepository.save(bookingStops);
    }

    return savedBooking;
  }

  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `AC${timestamp}${random}`;
  }

  /**
   * Check if aircraft is available for inquiry dates
   */
  private async checkAircraftAvailabilityForInquiry(
    aircraftId: number,
    departureDate: Date,
    returnDate?: Date | null
  ): Promise<boolean> {
    const startDate = departureDate;
    const endDate = returnDate || departureDate;

    // Check for conflicting calendar entries
    const conflicts = await this.aircraftCalendarRepository.find({
      where: {
        aircraftId,
        eventType: In([CalendarEventType.BOOKED, CalendarEventType.MAINTENANCE, CalendarEventType.BLOCKED]),
        startDateTime: Between(startDate, endDate),
      },
    });

    return conflicts.length === 0;
  }

  /**
   * Get aircraft availability for a date range
   */
  async getAircraftAvailabilityForInquiry(
    aircraftId: number,
    startDate: Date,
    endDate: Date
  ) {
    const aircraft = await this.aircraftRepository.findOne({
      where: { id: aircraftId },
      relations: ['company'],
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    // Get all calendar events for the aircraft in the date range
    const events = await this.aircraftCalendarRepository.find({
      where: {
        aircraftId,
        startDateTime: Between(startDate, endDate),
      },
      order: { startDateTime: 'ASC' },
    });

    // Group events by date
    const availabilityByDate = {};
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayEvents = events.filter(event => 
        event.startDateTime.toISOString().split('T')[0] === dateKey
      );

      availabilityByDate[dateKey] = {
        date: new Date(currentDate),
        isAvailable: dayEvents.length === 0,
        events: dayEvents,
        status: dayEvents.length === 0 ? 'available' : 'unavailable',
        reason: dayEvents.length > 0 ? dayEvents[0].eventType : null,
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      success: true,
      data: {
        aircraft,
        availability: availabilityByDate,
        summary: {
          totalDays: Object.keys(availabilityByDate).length,
          availableDays: Object.values(availabilityByDate).filter((day: any) => day.isAvailable).length,
          unavailableDays: Object.values(availabilityByDate).filter((day: any) => !day.isAvailable).length,
        },
      },
    };
  }

  private async sendInquiryNotifications(
    inquiry: BookingInquiry,
    aircraft: Aircraft,
    user: User,
    createBookingInquiryDto: CreateBookingInquiryDto
  ): Promise<void> {
    try {
      // Get charter company details
      const company = await this.chartersCompanyRepository.findOne({
        where: { id: aircraft.companyId }
      });

      if (!company) {
        console.error('Charter company not found for aircraft:', aircraft.id);
        return;
      }

      const inquiryData = {
        referenceNumber: inquiry.referenceNumber,
        customerName: `${user.first_name} ${user.last_name}`,
        customerEmail: user.email,
        aircraftName: aircraft.name,
        aircraftType: aircraft.type,
        origin: createBookingInquiryDto.origin || 'Not specified',
        destination: createBookingInquiryDto.destination || 'Not specified',
        departureDate: createBookingInquiryDto.preferredDepartureDate || 'Not specified',
        returnDate: createBookingInquiryDto.preferredReturnDate || undefined,
        requestedSeats: inquiry.requestedSeats,
        specialRequirements: inquiry.specialRequirements,
        userNotes: inquiry.userNotes,
        createdAt: inquiry.createdAt.toLocaleString(),
        passengers: [], // Will be populated from inquiry data if available
      };

      // Send email notification
      if (this.emailService && company.email) {
        await this.emailService.sendInquiryNotificationEmail(company.email, inquiryData);
      }

      // Send SMS notification
      if (this.smsService && company.mobileNumber) {
        await this.smsService.sendInquiryNotificationSms(company.mobileNumber, {
          referenceNumber: inquiry.referenceNumber,
          customerName: inquiryData.customerName,
          aircraftName: aircraft.name,
          requestedSeats: inquiry.requestedSeats,
        });
      }

      console.log(`Inquiry notifications sent for ${inquiry.referenceNumber} to company ${company.companyName}`);
    } catch (error) {
      console.error('Error sending inquiry notifications:', error);
      throw error;
    }
  }
} 