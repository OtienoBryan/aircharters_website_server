import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserTrip, UserTripStatus } from '../../common/entities/user-trips.entity';
import { Booking, BookingStatus } from '../../common/entities/booking.entity';

@Injectable()
export class TripSchedulerService {
  private readonly logger = new Logger(TripSchedulerService.name);

  constructor(
    @InjectRepository(UserTrip)
    private readonly userTripRepository: Repository<UserTrip>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  /**
   * Run daily at midnight to update trip statuses based on flight dates
   * This ensures trips are automatically marked as completed when flights have passed
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateTripStatuses() {
    this.logger.log('Starting daily trip status update...');
    
    try {
      // Get all trips with their booking and deal information
      const trips = await this.userTripRepository
        .createQueryBuilder('userTrip')
        .leftJoinAndSelect('userTrip.booking', 'booking')
        .leftJoinAndSelect('booking.deal', 'deal')
        .where('userTrip.status IN (:...statuses)', { 
          statuses: [UserTripStatus.UPCOMING] 
        })
        .getMany();

      let updatedCount = 0;
      const now = new Date();

      for (const trip of trips) {
        try {
          // Check if trip needs status update
          if (trip.needsStatusUpdate) {
            const newStatus = trip.calculatedStatus;
            
            // Update the trip status
            trip.status = newStatus;
            
            // Set appropriate timestamp
            if (newStatus === UserTripStatus.COMPLETED) {
              trip.completedAt = now;
            } else if (newStatus === UserTripStatus.CANCELLED) {
              trip.cancelledAt = now;
            }

            await this.userTripRepository.save(trip);
            updatedCount++;

            this.logger.log(
              `Updated trip ${trip.id} from ${trip.status} to ${newStatus}`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to update trip ${trip.id}: ${error.message}`
          );
        }
      }

      this.logger.log(
        `Trip status update completed. Updated ${updatedCount} trips.`
      );
    } catch (error) {
      this.logger.error(`Failed to update trip statuses: ${error.message}`);
    }
  }

  /**
   * Run every hour to check for recently cancelled bookings
   * This ensures trips are marked as cancelled when bookings are cancelled
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateCancelledTrips() {
    this.logger.log('Checking for cancelled bookings...');
    
    try {
      // Find trips that are still upcoming but their booking is cancelled
      const cancelledTrips = await this.userTripRepository
        .createQueryBuilder('userTrip')
        .leftJoinAndSelect('userTrip.booking', 'booking')
        .where('userTrip.status = :status', { status: UserTripStatus.UPCOMING })
        .andWhere('booking.bookingStatus = :bookingStatus', { 
          bookingStatus: BookingStatus.CANCELLED 
        })
        .getMany();

      let updatedCount = 0;

      for (const trip of cancelledTrips) {
        try {
          trip.status = UserTripStatus.CANCELLED;
          trip.cancelledAt = new Date();
          
          await this.userTripRepository.save(trip);
          updatedCount++;

          this.logger.log(
            `Marked trip ${trip.id} as cancelled due to booking cancellation`
          );
        } catch (error) {
          this.logger.error(
            `Failed to cancel trip ${trip.id}: ${error.message}`
          );
        }
      }

      if (updatedCount > 0) {
        this.logger.log(
          `Cancelled ${updatedCount} trips due to booking cancellations.`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update cancelled trips: ${error.message}`);
    }
  }

  /**
   * Manual method to update a specific trip's status
   * Useful for testing or manual interventions
   */
  async updateTripStatus(tripId: string): Promise<boolean> {
    try {
      const trip = await this.userTripRepository
        .createQueryBuilder('userTrip')
        .leftJoinAndSelect('userTrip.booking', 'booking')
        .leftJoinAndSelect('booking.deal', 'deal')
        .where('userTrip.id = :tripId', { tripId })
        .getOne();

      if (!trip) {
        this.logger.warn(`Trip ${tripId} not found`);
        return false;
      }

      if (trip.needsStatusUpdate) {
        const newStatus = trip.calculatedStatus;
        const oldStatus = trip.status;
        
        trip.status = newStatus;
        
        if (newStatus === UserTripStatus.COMPLETED) {
          trip.completedAt = new Date();
        } else if (newStatus === UserTripStatus.CANCELLED) {
          trip.cancelledAt = new Date();
        }

        await this.userTripRepository.save(trip);
        
        this.logger.log(
          `Manually updated trip ${tripId} from ${oldStatus} to ${newStatus}`
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to manually update trip ${tripId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get statistics about trips that need status updates
   * Useful for monitoring and debugging
   */
  async getStatusUpdateStats(): Promise<{
    totalTrips: number;
    needsUpdate: number;
    upcomingTrips: number;
    completedTrips: number;
    cancelledTrips: number;
  }> {
    const trips = await this.userTripRepository
      .createQueryBuilder('userTrip')
      .leftJoinAndSelect('userTrip.booking', 'booking')
      .leftJoinAndSelect('booking.deal', 'deal')
      .getMany();

    const stats = {
      totalTrips: trips.length,
      needsUpdate: 0,
      upcomingTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
    };

    for (const trip of trips) {
      if (trip.needsStatusUpdate) {
        stats.needsUpdate++;
      }

      const calculatedStatus = trip.calculatedStatus;
      switch (calculatedStatus) {
        case UserTripStatus.UPCOMING:
          stats.upcomingTrips++;
          break;
        case UserTripStatus.COMPLETED:
          stats.completedTrips++;
          break;
        case UserTripStatus.CANCELLED:
          stats.cancelledTrips++;
          break;
      }
    }

    return stats;
  }
}
