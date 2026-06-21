import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingTimeline, TimelineEventType } from '../../../common/entities/booking-timeline.entity';

@Injectable()
export class BookingTimelineService {
  constructor(
    @InjectRepository(BookingTimeline)
    private readonly timelineRepository: Repository<BookingTimeline>,
  ) {}

  /**
   * Create a timeline event for a booking
   */
  async createTimelineEvent(
    bookingId: string,
    eventType: TimelineEventType,
    data: {
      title: string;
      description?: string;
      oldValue?: string;
      newValue?: string;
      metadata?: any;
    },
  ): Promise<BookingTimeline> {
    const timelineEvent = this.timelineRepository.create({
      bookingId: parseInt(bookingId),
      eventType,
      title: data.title,
      description: data.description,
      oldValue: data.oldValue,
      newValue: data.newValue,
      metadata: data.metadata,
    });

    return await this.timelineRepository.save(timelineEvent);
  }

  /**
   * Get timeline events for a booking
   */
  async getBookingTimeline(bookingId: string): Promise<BookingTimeline[]> {
    return this.timelineRepository
      .createQueryBuilder('timeline')
      .where('timeline.bookingId = :bookingId', { bookingId })
      .orderBy('timeline.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get timeline events by type for a booking
   */
  async getTimelineEventsByType(
    bookingId: string,
    eventType: TimelineEventType,
  ): Promise<BookingTimeline[]> {
    return this.timelineRepository
      .createQueryBuilder('timeline')
      .where('timeline.bookingId = :bookingId', { bookingId })
      .andWhere('timeline.eventType = :eventType', { eventType })
      .orderBy('timeline.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get recent timeline events across all bookings
   */
  async getRecentTimelineEvents(limit: number = 10): Promise<BookingTimeline[]> {
    return this.timelineRepository
      .createQueryBuilder('timeline')
      .orderBy('timeline.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Delete timeline events for a booking (useful for cleanup)
   */
  async deleteTimelineEvents(bookingId: string): Promise<void> {
    await this.timelineRepository
      .createQueryBuilder()
      .delete()
      .where('bookingId = :bookingId', { bookingId })
      .execute();
  }
} 