import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserTrip, UserTripStatus } from '../../common/entities/user-trips.entity';
import { Booking } from '../../common/entities/booking.entity';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';
import { Aircraft } from '../../common/entities/aircraft.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(UserTrip)
    private readonly userTripRepository: Repository<UserTrip>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(CharterDeal)
    private readonly charterDealRepository: Repository<CharterDeal>,
    @InjectRepository(ChartersCompany)
    private readonly companyRepository: Repository<ChartersCompany>,
    @InjectRepository(Aircraft)
    private readonly aircraftRepository: Repository<Aircraft>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get user trip history with full booking and deal details
   * Fetches directly from charter_bookings table for all booking types
   */
  async getUserTripHistory(userId: string): Promise<any[]> {
    try {
      // Get all bookings from charter_bookings table for the user
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.passengers', 'passengers')
        .leftJoinAndSelect('booking.stops', 'stops')
        .leftJoinAndSelect('booking.deal', 'deal')
        .leftJoinAndSelect('deal.company', 'company')
        .leftJoinAndSelect('deal.aircraft', 'aircraft')
        .leftJoinAndSelect('booking.aircraft', 'directAircraft')
        .leftJoinAndSelect('directAircraft.company', 'directCompany')
        .where('booking.userId = :userId', { userId })
        .orderBy('booking.createdAt', 'DESC')
        .getMany();

      // Format all bookings as trips with calculated status
      return bookings.map(booking => this.formatBookingAsTrip(booking));
    } catch (error) {
      console.error('Error fetching user trip history:', error);
      return [];
    }
  }

  /**
   * Get trips by status (pending, upcoming, completed, cancelled)
   * Filters by calculated status based on booking status and departure date
   */
  async getTripsByStatus(userId: string, status: UserTripStatus): Promise<any[]> {
    try {
      // Get all trips first (using the main method)
      const allTrips = await this.getUserTripHistory(userId);
      
      // Filter by the requested status
      return allTrips.filter(trip => trip.status === status);
    } catch (error) {
      console.error('Error fetching trips by status:', error);
      return [];
    }
  }

  /**
   * Get specific trip by ID
   */
  async getTripById(tripId: string, userId: string): Promise<any> {
    const userTrip = await this.userTripRepository
      .createQueryBuilder('userTrip')
      .leftJoinAndSelect('userTrip.booking', 'booking')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.stops', 'stops')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('deal.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      // .leftJoinAndSelect('deal.fixedRoute', 'route') // Not using fixed routes
      .where('userTrip.id = :tripId', { tripId })
      .andWhere('userTrip.userId = :userId', { userId })
      .getOne();

    if (!userTrip) {
      throw new NotFoundException('Trip not found');
    }

    return this.formatTripResponse(userTrip);
  }

  /**
   * Update trip status
   */
  async updateTripStatus(
    tripId: string,
    userId: string,
    status: UserTripStatus,
  ): Promise<any> {
    const userTrip = await this.userTripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!userTrip) {
      throw new NotFoundException('Trip not found');
    }

    // Update status and relevant timestamp
    userTrip.status = status;
    
    if (status === UserTripStatus.COMPLETED) {
      userTrip.completedAt = new Date();
    } else if (status === UserTripStatus.CANCELLED) {
      userTrip.cancelledAt = new Date();
    }

    const updatedTrip = await this.userTripRepository.save(userTrip);

    // Return full trip details
    return this.getTripById(tripId, userId);
  }

  /**
   * Add or update trip review and rating
   */
  async addTripReview(
    tripId: string,
    userId: string,
    reviewData: {
      rating: number;
      review: string;
      photos?: string;
      videos?: string;
    },
  ): Promise<any> {
    const userTrip = await this.userTripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!userTrip) {
      throw new NotFoundException('Trip not found');
    }

    // Validate rating
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Update review data
    userTrip.rating = reviewData.rating;
    userTrip.review = reviewData.review;
    userTrip.reviewDate = new Date();
    userTrip.photos = reviewData.photos;
    userTrip.videos = reviewData.videos;

    await this.userTripRepository.save(userTrip);

    // Return full trip details
    return this.getTripById(tripId, userId);
  }

  /**
   * Get trip statistics for user
   * Now uses calculated status for accurate statistics
   */
  async getTripStats(userId: string): Promise<any> {
    const userTrips = await this.userTripRepository
      .createQueryBuilder('userTrip')
      .leftJoinAndSelect('userTrip.booking', 'booking')
      .leftJoinAndSelect('booking.deal', 'deal')
      .where('userTrip.user_id = :userId', { userId })
      .getMany();

    const totalTrips = userTrips.length;
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;
    let totalRating = 0;
    let ratedTrips = 0;

    for (const trip of userTrips) {
      const calculatedStatus = trip.calculatedStatus;
      
      switch (calculatedStatus) {
        case UserTripStatus.UPCOMING:
          upcoming++;
          break;
        case UserTripStatus.COMPLETED:
          completed++;
          break;
        case UserTripStatus.CANCELLED:
          cancelled++;
          break;
      }

      if (trip.rating && trip.rating > 0) {
        totalRating += trip.rating;
        ratedTrips++;
      }
    }

    const averageRating = ratedTrips > 0 ? totalRating / ratedTrips : 0;

    return {
      total: totalTrips,
      upcoming,
      completed,
      cancelled,
      averageRating: parseFloat(averageRating.toFixed(2)),
    };
  }

  /**
   * Get pending bookings (bookings without user trips)
   * These are bookings that are pending or priced but haven't been paid yet
   */
  async getPendingBookings(userId: string): Promise<any[]> {
    const pendingBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.deal', 'deal')
      .leftJoinAndSelect('deal.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      // .leftJoinAndSelect('deal.fixedRoute', 'route') // Not using fixed routes
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.bookingStatus IN (:...statuses)', { 
        statuses: ['pending', 'priced'] 
      })
      .andWhere('booking.paymentStatus = :paymentStatus', { 
        paymentStatus: 'pending' 
      })
      .andWhere('NOT EXISTS (SELECT 1 FROM user_trips ut WHERE ut.booking_id = booking.id)')
      .orderBy('booking.createdAt', 'DESC')
      .getMany();

    return pendingBookings.map(booking => this.formatBookingAsTrip(booking));
  }

  /**
   * Format booking as trip response with calculated status
   */
  private formatBookingAsTrip(booking: any): any {
    const deal = booking.deal as any;
    const company = deal?.company as any;
    const aircraft = deal?.aircraft as any;
    const directAircraft = booking.aircraft as any;
    const directCompany = directAircraft?.company as any;

    // Calculate status based on booking status and departure date
    const calculatedStatus = this.calculateTripStatus(booking);

    return {
      id: `trip_${booking.id}`,
      userId: booking.userId,
      bookingId: booking.id,
      status: calculatedStatus,
      rating: null,
      review: null,
      reviewDate: null,
      photos: null,
      videos: null,
      createdAt: booking.createdAt,
      completedAt: calculatedStatus === 'completed' ? booking.departureDateTime : null,
      cancelledAt: calculatedStatus === 'cancelled' ? booking.updatedAt : null,
      booking: {
        id: booking.id,
        userId: booking.userId,
        companyId: booking.companyId,
        referenceNumber: booking.referenceNumber,
        totalPrice: booking.totalPrice,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        departureDateTime: booking.departureDateTime,
        passengers: booking.passengers || [],
        // Deal-based booking data
        deal: deal ? {
          id: deal.id,
          date: deal.date,
          time: deal.time,
          pricePerSeat: deal.pricePerSeat,
          company: company ? {
            id: company.id,
            name: company.name,
            logo: company.logo,
          } : null,
          route: {
            origin: deal.originName || booking.originName,
            destination: deal.destinationName || booking.destinationName,
            originLatitude: deal.originLatitude || booking.originLatitude,
            originLongitude: deal.originLongitude || booking.originLongitude,
            destinationLatitude: deal.destinationLatitude || booking.destinationLatitude,
            destinationLongitude: deal.destinationLongitude || booking.destinationLongitude,
          },
          aircraft: aircraft ? {
            id: aircraft.id,
            name: aircraft.name,
            type: aircraft.type,
            capacity: aircraft.capacity,
          } : null,
        } : null,
        // Direct charter booking data
        directCharter: !deal ? {
          aircraft: directAircraft ? {
            id: directAircraft.id,
            name: directAircraft.name,
            type: directAircraft.type,
            capacity: directAircraft.capacity,
          } : null,
          company: directCompany ? {
            id: directCompany.id,
            name: directCompany.name,
            logo: directCompany.logo,
          } : null,
          route: {
            origin: booking.originName,
            destination: booking.destinationName,
            originLatitude: booking.originLatitude,
            originLongitude: booking.originLongitude,
            destinationLatitude: booking.destinationLatitude,
            destinationLongitude: booking.destinationLongitude,
          },
        } : null,
      },
    };
  }

  /**
   * Create user trip record (called when booking payment is processed)
   */
  async createUserTrip(bookingId: string, userId: string): Promise<UserTrip> {
    const userTrip = this.userTripRepository.create({
      id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      bookingId,
      status: UserTripStatus.UPCOMING,
    });

    return await this.userTripRepository.save(userTrip);
  }

  /**
   * Calculate trip status based on booking status and departure date
   * pending - Pending bookings (pending or priced status with totalPrice > 0)
   * upcoming - Upcoming trips (confirmed status)
   * completed - Completed trips (departure day passed)
   * cancelled - Cancelled trips
   */
  private calculateTripStatus(booking: any): string {
    // If booking is cancelled, trip is cancelled
    if (booking.bookingStatus === 'cancelled') {
      return 'cancelled';
    }
    
    // If booking status is pending or priced, trip is pending
    if (booking.bookingStatus === 'pending' || booking.bookingStatus === 'priced') {
      return 'pending';
    }
    
    // If booking is confirmed, check departure date
    if (booking.bookingStatus === 'confirmed') {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      const departureDate = new Date(booking.departureDateTime);
      departureDate.setHours(0, 0, 0, 0); // Reset time to start of day
      
      // If departure date has passed, trip is completed
      if (departureDate < today) {
        return 'completed';
      }
      
      // Otherwise, trip is upcoming
      return 'upcoming';
    }
    
    // Default to pending for any other status
    return 'pending';
  }

  /**
   * Format trip response with all related data
   */
  private formatTripResponse(userTrip: UserTrip): any {
    const booking = userTrip.booking as any;
    const deal = booking?.deal as any;
    const company = deal?.company as any;
    const aircraft = deal?.aircraft as any;

    return {
      id: userTrip.id,
      userId: userTrip.userId, // Add missing userId field
      bookingId: userTrip.bookingId,
      status: userTrip.calculatedStatus, // Use calculated status instead of stored status
      rating: userTrip.rating,
      review: userTrip.review,
      reviewDate: userTrip.reviewDate,
      photos: userTrip.photos,
      videos: userTrip.videos,
      createdAt: userTrip.createdAt,
      completedAt: userTrip.completedAt,
      cancelledAt: userTrip.cancelledAt,
      booking: booking ? {
        id: booking.id,
        userId: booking.userId,
        companyId: booking.companyId,
        referenceNumber: booking.referenceNumber,
        totalPrice: booking.totalPrice,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        passengers: booking.passengers || [],
        deal: deal ? {
          id: deal.id,
          date: deal.date,
          time: deal.time,
          pricePerSeat: deal.pricePerSeat,
          company: company ? {
            id: company.id,
            name: company.name,
            logo: company.logo,
          } : null,
          route: deal ? {
            origin: deal.originName,
            destination: deal.destinationName,
            originLatitude: deal.originLatitude,
            originLongitude: deal.originLongitude,
            destinationLatitude: deal.destinationLatitude,
            destinationLongitude: deal.destinationLongitude,
          } : null,
          aircraft: aircraft ? {
            id: aircraft.id,
            name: aircraft.name,
            type: aircraft.type,
            capacity: aircraft.capacity,
          } : null,
        } : null,
      } : null,
    };
  }
} 