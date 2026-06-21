import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus, PaymentStatus } from '../../../common/entities/booking.entity';
import { BookingTimeline, TimelineEventType } from '../../../common/entities/booking-timeline.entity';
import { WalletTransaction, WalletTransactionType } from '../../../common/entities/wallet-transaction.entity';
import { User } from '../../../common/entities/user.entity';
import { Payment, PaymentMethod, PaymentStatus as PaymentEntityStatus } from '../../../common/entities/payment.entity';
import { UserTrip, UserTripStatus } from '../../../common/entities/user-trips.entity';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class BookingPaymentService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingTimeline)
    private readonly timelineRepository: Repository<BookingTimeline>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(UserTrip)
    private readonly userTripRepository: Repository<UserTrip>,
    private readonly walletService: WalletService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Process payment and populate points/reference only when payment is successful
   */
  async processPayment(
    bookingId: string,
    paymentTransactionId: string,
    paymentMethod: string,
    amount: number,
  ): Promise<Booking> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.processPaymentAttempt(bookingId, paymentTransactionId, paymentMethod, amount);
      } catch (error) {
        lastError = error;
        
        // Check if it's a lock timeout error
        if (error.message && error.message.includes('Lock wait timeout exceeded')) {
          if (attempt < maxRetries) {
            // Exponential backoff: wait 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`Lock timeout on attempt ${attempt}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // For non-lock errors or final attempt, throw immediately
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Single attempt to process payment
   */
  private async processPaymentAttempt(
    bookingId: string,
    paymentTransactionId: string,
    paymentMethod: string,
    amount: number,
  ): Promise<Booking> {
    // First, check if booking exists and can be processed
    const existingBooking = await this.bookingRepository.findOne({
      where: { id: parseInt(bookingId) },
      relations: ['user'],
    });

    if (!existingBooking) {
      throw new BadRequestException('Booking not found');
    }

    if (existingBooking.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Payment already processed');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use SELECT FOR UPDATE to prevent race conditions
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: parseInt(bookingId) },
        relations: ['user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new BadRequestException('Booking not found');
      }

      if (booking.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Payment already processed');
      }

      // Update payment status
      booking.paymentStatus = PaymentStatus.PAID;
      // booking.paymentTransactionId = paymentTransactionId; // Not in database
      booking.bookingStatus = BookingStatus.CONFIRMED;

      // Calculate and populate loyalty points only when payment is made
      const loyaltyPointsToEarn = Math.floor(amount * 5); // 1 USD = 5 miles
      // booking.loyaltyPointsEarned = loyaltyPointsToEarn; // Not in database

      // Save booking
      await queryRunner.manager.save(booking);

      // Create payment record
      const payment = queryRunner.manager.create(Payment, {
        userId: booking.userId,
        companyId: booking.companyId,
        bookingId: booking.id.toString(),
        paymentMethod: this.mapPaymentMethod(paymentMethod),
        totalAmount: amount,
        platformFee: Math.floor(amount * 0.05), // 5% platform fee
        companyAmount: amount - Math.floor(amount * 0.05),
        currency: 'USD',
        transactionId: paymentTransactionId,
        paymentStatus: PaymentEntityStatus.COMPLETED,
      });

      await queryRunner.manager.save(payment);

      // Create user trip record
      const userTrip = queryRunner.manager.create(UserTrip, {
        userId: booking.userId,
        bookingId: booking.id.toString(),
        status: UserTripStatus.UPCOMING,
      });

      await queryRunner.manager.save(userTrip);

      // Create timeline events within the transaction
      await this.createTimelineEvent(
        bookingId,
        TimelineEventType.PAYMENT_STATUS_CHANGED,
        {
          title: 'Payment Processed',
          description: `Payment of $${amount} processed successfully. ${loyaltyPointsToEarn} loyalty points earned.`,
          newValue: PaymentStatus.PAID,
          metadata: {
            paymentTransactionId,
            paymentMethod,
            amount,
            loyaltyPointsEarned: loyaltyPointsToEarn,
            referenceNumber: booking.referenceNumber,
          },
        },
        queryRunner,
      );

      await this.createTimelineEvent(
        bookingId,
        TimelineEventType.BOOKING_CONFIRMED,
        {
          title: 'Booking Confirmed',
          description: `Booking confirmed after successful payment. Reference: ${booking.referenceNumber}`,
          metadata: {
            paymentTransactionId,
            referenceNumber: booking.referenceNumber,
          },
        },
        queryRunner,
      );

      await queryRunner.commitTransaction();

      // Process loyalty points outside the transaction to avoid lock conflicts
      if (loyaltyPointsToEarn > 0) {
        try {
          await this.walletService.earnLoyaltyPoints(
            booking.userId,
            loyaltyPointsToEarn,
            `Booking ${booking.referenceNumber} - Earned ${loyaltyPointsToEarn} miles from $${amount} payment`,
            bookingId,
          );
        } catch (walletError) {
          // Log the error but don't fail the payment processing
          console.error('Failed to process loyalty points:', walletError);
          // You might want to create a background job to retry this later
        }
      }

      return booking;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update payment status without processing points/reference
   */
  async updatePaymentStatus(
    bookingId: string,
    paymentStatus: PaymentStatus,
    paymentTransactionId?: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: parseInt(bookingId) },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    const oldPaymentStatus = booking.paymentStatus;
    booking.paymentStatus = paymentStatus;

    if (paymentTransactionId) {
      // booking.paymentTransactionId = paymentTransactionId; // Not in database
    }

    // Only auto-confirm if payment is successful
    if (paymentStatus === PaymentStatus.PAID && booking.bookingStatus === BookingStatus.PENDING) {
      booking.bookingStatus = BookingStatus.CONFIRMED;
    }

    await this.bookingRepository.save(booking);

    // Create timeline event
    await this.createTimelineEvent(bookingId, TimelineEventType.PAYMENT_STATUS_CHANGED, {
      title: 'Payment Status Updated',
      description: `Payment status changed from ${oldPaymentStatus} to ${paymentStatus}`,
      oldValue: oldPaymentStatus,
      newValue: paymentStatus,
      metadata: { paymentTransactionId },
    });

    return booking;
  }

  /**
   * Process refund and adjust loyalty points
   */
  async processRefund(
    bookingId: string,
    refundAmount: number,
    refundReason: string,
  ): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: parseInt(bookingId) },
        relations: ['user'],
      });

      if (!booking) {
        throw new BadRequestException('Booking not found');
      }

      // Calculate loyalty points to deduct (proportional to refund)
      const refundRatio = refundAmount / booking.totalPrice;
      // const loyaltyPointsToDeduct = Math.floor(booking.loyaltyPointsEarned * refundRatio); // Not in database

      // Deduct loyalty points if any were earned
      // if (loyaltyPointsToDeduct > 0) {
      //   await this.walletService.createWalletTransaction(
      //     booking.userId,
      //     WalletTransactionType.LOYALTY_ADJUSTMENT,
      //     0,
      //     -loyaltyPointsToDeduct,
      //     `Refund for booking ${booking.referenceNumber} - Deducted ${loyaltyPointsToDeduct} miles`,
      //     bookingId,
      //     { refundAmount, refundReason },
      //   );
      // }

      // Update booking status
      booking.bookingStatus = BookingStatus.CANCELLED;
      booking.paymentStatus = PaymentStatus.REFUNDED;

      await queryRunner.manager.save(booking);

      // Create timeline event
      await this.createTimelineEvent(
        bookingId,
        TimelineEventType.PAYMENT_STATUS_CHANGED,
        {
          title: 'Refund Processed',
          description: `Refund of $${refundAmount} processed.`,
          newValue: PaymentStatus.REFUNDED,
          metadata: {
            refundAmount,
            refundReason,
            // loyaltyPointsDeducted: loyaltyPointsToDeduct, // Not in database
          },
        },
        queryRunner,
      );

      await queryRunner.commitTransaction();
      return booking;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private generateBookingReference(): string {
    const prefix = 'AC'; // Air Charters
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
    return `${prefix}${timestamp}${random}`;
  }

  private async createTimelineEvent(
    bookingId: string,
    eventType: TimelineEventType,
    data: {
      title: string;
      description?: string;
      oldValue?: string;
      newValue?: string;
      metadata?: any;
    },
    queryRunner?: any,
  ): Promise<void> {
    const timelineEvent = queryRunner
      ? queryRunner.manager.create(BookingTimeline, {
          bookingId: parseInt(bookingId),
          eventType,
          title: data.title,
          description: data.description,
          oldValue: data.oldValue,
          newValue: data.newValue,
          metadata: data.metadata,
          createdAt: new Date(),
        })
      : this.timelineRepository.create({
          bookingId: parseInt(bookingId),
          eventType,
          title: data.title,
          description: data.description,
          oldValue: data.oldValue,
          newValue: data.newValue,
          metadata: data.metadata,
          createdAt: new Date(),
        });

    if (queryRunner) {
      await queryRunner.manager.save(timelineEvent);
    } else {
      await this.timelineRepository.save(timelineEvent);
    }
  }

  /**
   * Map string payment method to PaymentMethod enum
   */
  private mapPaymentMethod(paymentMethod: string): PaymentMethod {
    switch (paymentMethod.toLowerCase()) {
      case 'card':
      case 'credit_card':
      case 'debit_card':
        return PaymentMethod.CARD;
      case 'mpesa':
        return PaymentMethod.MPESA;
      case 'wallet':
        return PaymentMethod.WALLET;
      default:
        return PaymentMethod.CARD; // Default fallback
    }
  }
} 