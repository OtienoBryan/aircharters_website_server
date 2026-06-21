import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking, BookingStatus, PaymentStatus } from '../../../common/entities/booking.entity';
import { BookingStatusResponseDto } from '../dto/booking-status-response.dto';

@Injectable()
export class BookingQueryService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  /**
   * Find all bookings with optional user filter
   */
  async findAll(userId?: string): Promise<Booking[]> {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('booking.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')

    if (userId) {
      query.where('booking.userId = :userId', { userId });
    }

    return query
      .orderBy('booking.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find booking by ID with all relations
   */
  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('booking.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .where('booking.id = :id', { id })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  /**
   * Find booking by reference number
   */
  async findByReference(referenceNumber: string): Promise<Booking> {
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('booking.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .where('booking.referenceNumber = :referenceNumber', { referenceNumber })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Booking with reference ${referenceNumber} not found`);
    }

    return booking;
  }

  /**
   * Find bookings by user with filters
   */
  async findByUserWithFilters(
    userId: string,
    filters: { upcoming?: boolean; status?: BookingStatus }
  ): Promise<Booking[]> {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('booking.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .where('booking.userId = :userId', { userId });

    // Filter by upcoming/past bookings
    if (filters.upcoming !== undefined) {
      const now = new Date();
      if (filters.upcoming) {
        query.andWhere('deal.date >= :now', { now });
      } else {
        query.andWhere('deal.date < :now', { now });
      }
    }

    // Filter by booking status
    if (filters.status) {
      query.andWhere('booking.bookingStatus = :status', { status: filters.status });
    }

    return query
      .orderBy('deal.date', 'ASC')
      .addOrderBy('deal.time', 'ASC')
      .getMany();
  }

  /**
   * Find pending payment bookings for a user
   */
  async findPendingPaymentBookings(userId: string): Promise<Booking[]> {
    return this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('deal.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.paymentStatus = :paymentStatus', { 
        paymentStatus: PaymentStatus.PENDING 
      })
      .andWhere('booking.bookingStatus = :bookingStatus', { 
        bookingStatus: BookingStatus.PENDING 
      })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get booking status by reference number (public endpoint)
   */
  async getBookingStatusByReference(referenceNumber: string): Promise<BookingStatusResponseDto> {
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('deal.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .where('booking.referenceNumber = :referenceNumber', { referenceNumber })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Booking with reference ${referenceNumber} not found`);
    }

    return {
      referenceNumber: booking.referenceNumber,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      flightDate: booking.deal.date.toString(),
      flightTime: booking.deal.time.toString(),
      origin: booking.deal.originName,
      destination: booking.deal.destinationName,
      aircraftName: booking.deal.aircraft.name,
      companyName: booking.deal.company.companyName,
      totalPrice: booking.totalPrice.toString(),
      passengerCount: booking.passengers.length,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(userId?: string): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  }> {
    const query = this.bookingRepository.createQueryBuilder('booking');
    
    if (userId) {
      query.where('booking.userId = :userId', { userId });
    }

    const [total, pending, confirmed, cancelled, completed] = await Promise.all([
      query.getCount(),
      query.andWhere('booking.bookingStatus = :status', { status: BookingStatus.PENDING }).getCount(),
      query.andWhere('booking.bookingStatus = :status', { status: BookingStatus.CONFIRMED }).getCount(),
      query.andWhere('booking.bookingStatus = :status', { status: BookingStatus.CANCELLED }).getCount(),
      query.andWhere('booking.bookingStatus = :status', { status: BookingStatus.COMPLETED }).getCount(),
    ]);

    return { total, pending, confirmed, cancelled, completed };
  }

  /**
   * Check if user has existing booking for a deal
   */
  async hasExistingBooking(userId: string, dealId: number): Promise<boolean> {
    const existing = await this.bookingRepository.findOne({
      where: {
        userId,
        dealId,
        bookingStatus: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
      },
    });
    return !!existing;
  }

  /**
   * Get booking summary with loyalty and wallet information
   */
  async getBookingSummary(bookingId: string): Promise<any> {
    const booking = await this.findOne(bookingId);
    
    return {
      id: booking.id,
      referenceNumber: booking.referenceNumber,
      totalPrice: booking.totalPrice,
      // loyaltyPointsEarned: booking.loyaltyPointsEarned, // Not in database
      // loyaltyPointsRedeemed: booking.loyaltyPointsRedeemed, // Not in database
      // walletAmountUsed: booking.walletAmountUsed, // Not in database
      netAmount: booking.totalPrice, // Simplified without wallet amount
      company: booking.company,
      deal: booking.deal,
      passengers: booking.passengers,
      status: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
    };
  }
} 