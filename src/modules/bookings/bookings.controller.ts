import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatusResponseDto } from './dto/booking-status-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BookingStatus, PaymentStatus } from '../../common/entities/booking.entity';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('test-user/:userId')
  @ApiOperation({ summary: 'Test if user exists in database' })
  async testUser(@Param('userId') userId: string) {
    return await this.bookingsService.testUserExists(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking with passengers and payment intent' })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            booking: { $ref: '#/components/schemas/Booking' },
            paymentIntent: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                clientSecret: { type: 'string' },
                status: { type: 'string' },
                requiresAction: { type: 'boolean' },
                nextAction: { type: 'object' },
              },
            },
            paymentInstructions: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' },
                paymentMethods: { type: 'array', items: { type: 'string' } },
                nextSteps: { type: 'array', items: { type: 'string' } },
                apiEndpoints: { type: 'object' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid booking data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    const result = await this.bookingsService.createWithPaymentIntent(createBookingDto, req.user.sub);
    
    return {
      success: true,
      message: 'Booking created successfully. Please complete payment to confirm.',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings for the authenticated user' })
  @ApiQuery({ 
    name: 'upcoming', 
    required: false, 
    type: Boolean, 
    description: 'Filter upcoming (true) or past (false) bookings' 
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: BookingStatus, 
    description: 'Filter by booking status' 
  })
  @ApiResponse({
    status: 200,
    description: 'Bookings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Booking' },
        },
        count: { type: 'number' },
      },
    },
  })
  async findAll(
    @Request() req,
    @Query('upcoming') upcoming?: boolean,
    @Query('status') status?: BookingStatus
  ) {
    const bookings = await this.bookingsService.findByUserWithFilters(
      req.user.sub,
      { upcoming, status }
    );
    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: bookings,
      count: bookings.length,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiResponse({
    status: 200,
    description: 'Booking statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            pending: { type: 'number' },
            confirmed: { type: 'number' },
            cancelled: { type: 'number' },
            completed: { type: 'number' },
          },
        },
      },
    },
  })
  async getStats(@Request() req) {
    const stats = await this.bookingsService.getBookingStats(req.user.sub);
    return {
      success: true,
      message: 'Booking statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('reference/:reference')
  @ApiOperation({ summary: 'Get booking by reference number' })
  @ApiParam({ name: 'reference', type: String, description: 'Booking reference number' })
  @ApiResponse({
    status: 200,
    description: 'Booking retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/Booking' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findByReference(@Param('reference') reference: string) {
    const booking = await this.bookingsService.findByReference(reference);
    return {
      success: true,
      message: 'Booking retrieved successfully',
      data: booking,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/Booking' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string) {
    const booking = await this.bookingsService.findOne(id);
    return {
      success: true,
      message: 'Booking retrieved successfully',
      data: booking,
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking status updated successfully',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: BookingStatus },
  ) {
    const booking = await this.bookingsService.updateStatus(id, body.status);
    return {
      success: true,
      message: 'Booking status updated successfully',
      data: booking,
    };
  }

  @Patch(':id/payment-status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment status updated successfully',
  })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { paymentStatus: PaymentStatus },
  ) {
    const booking = await this.bookingsService.updatePaymentStatus(id, body.paymentStatus);
    return {
      success: true,
      message: 'Payment status updated successfully',
      data: booking,
    };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Booking cannot be cancelled' })
  async cancel(@Param('id') id: string, @Request() req) {
    const booking = await this.bookingsService.cancel(id, req.user.sub);
    return {
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    };
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking after payment' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking confirmed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            referenceNumber: { type: 'string' },
            bookingStatus: { type: 'string' },
            paymentStatus: { type: 'string' },
            confirmationEmail: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Booking cannot be confirmed' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async confirmBooking(
    @Param('id') id: string,
    @Request() req,
    @Body() confirmData: { paymentTransactionId: string }
  ) {
    const result = await this.bookingsService.confirmBooking(
      id,
      req.user.sub,
      confirmData.paymentTransactionId
    );
    return {
      success: true,
      message: 'Booking confirmed successfully',
      data: result,
    };
  }

  @Get('pending-payment')
  @ApiOperation({ summary: 'Get bookings pending payment' })
  @ApiResponse({
    status: 200,
    description: 'Pending payment bookings retrieved',
  })
  async getPendingPaymentBookings(@Request() req) {
    const bookings = await this.bookingsService.findPendingPaymentBookings(req.user.sub);
    return {
      success: true,
      message: 'Pending payment bookings retrieved',
      data: bookings,
      count: bookings.length,
    };
  }

  @Post(':id/process-payment')
  @ApiOperation({ summary: 'Process payment for a booking and populate points/reference' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            referenceNumber: { type: 'string' },
            bookingStatus: { type: 'string' },
            paymentStatus: { type: 'string' },
            loyaltyPointsEarned: { type: 'number' },
            paymentTransactionId: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Payment processing failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async processPayment(
    @Param('id') id: string,
    @Request() req,
    @Body() paymentData: {
      paymentTransactionId: string;
      paymentMethod: string;
      amount: number;
    }
  ) {
    const booking = await this.bookingsService.bookingPaymentService.processPayment(
      id,
      paymentData.paymentTransactionId,
      paymentData.paymentMethod,
      paymentData.amount
    );

    return {
      success: true,
      message: 'Payment processed successfully. Booking confirmed and loyalty points earned.',
      data: {
        id: booking.id,
        referenceNumber: booking.referenceNumber,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        // loyaltyPointsEarned: booking.loyaltyPointsEarned, // Not in database
        // paymentTransactionId: booking.paymentTransactionId, // Not in database
      },
    };
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Complete payment for booking with Stripe integration' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment completed and booking confirmed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            booking: { $ref: '#/components/schemas/Booking' },
            payment: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                transactionId: { type: 'string' },
                amount: { type: 'number' },
                status: { type: 'string' },
                paymentMethod: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Payment failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async completePayment(
    @Param('id') id: string,
    @Request() req,
    @Body() body: {
      paymentIntentId: string;
      paymentMethodId?: string;
    }
  ) {
    // 1. Confirm payment with Stripe
    const payment = await this.bookingsService.paymentProviderService.confirmPayment({
      paymentIntentId: body.paymentIntentId,
      paymentMethodId: body.paymentMethodId,
    });

    // 2. Process booking payment
    const booking = await this.bookingsService.bookingPaymentService.processPayment(
      id,
      payment.transactionId,
      payment.paymentMethod,
      payment.amount
    );

    return {
      success: true,
      message: 'Payment completed and booking confirmed',
      data: {
        booking,
        payment: {
          id: payment.id,
          transactionId: payment.transactionId,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
        },
      },
    };
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process refund for a booking and adjust loyalty points' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            bookingStatus: { type: 'string' },
            paymentStatus: { type: 'string' },
            refundAmount: { type: 'number' },
            loyaltyPointsDeducted: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Refund processing failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async processRefund(
    @Param('id') id: string,
    @Request() req,
    @Body() refundData: {
      refundAmount: number;
      refundReason: string;
    }
  ) {
    const booking = await this.bookingsService.bookingPaymentService.processRefund(
      id,
      refundData.refundAmount,
      refundData.refundReason
    );

    return {
      success: true,
      message: 'Refund processed successfully. Loyalty points adjusted accordingly.',
      data: {
        id: booking.id,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        refundAmount: refundData.refundAmount,
        refundReason: refundData.refundReason,
      },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.bookingsService.remove(id);
    return {
      success: true,
      message: 'Booking deleted successfully',
    };
  }

  // Public endpoint - no authentication required
  @Get('status/:reference')
  @ApiOperation({ summary: 'Get booking status by reference number (public)' })
  @ApiParam({ name: 'reference', type: String, description: 'Booking reference number' })
  @ApiResponse({
    status: 200,
    description: 'Booking status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/BookingStatusResponseDto' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingStatus(@Param('reference') reference: string) {
    const bookingStatus = await this.bookingsService.getBookingStatusByReference(reference);
    return {
      success: true,
      message: 'Booking status retrieved successfully',
      data: bookingStatus,
    };
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get booking timeline' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking timeline retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              eventType: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              oldValue: { type: 'string' },
              newValue: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getBookingTimeline(@Param('id') id: string, @Request() req) {
    // Verify ownership
    const booking = await this.bookingsService.findOne(id);
    if (booking.userId !== req.user.sub) {
      throw new BadRequestException('You can only view your own booking timeline');
    }

    const timeline = await this.bookingsService.getBookingTimeline(id);
    return {
      success: true,
      message: 'Booking timeline retrieved successfully',
      data: timeline,
    };
  }

  @Patch(':id/confirm-payment')
  @ApiOperation({ summary: 'Confirm booking after successful payment' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking confirmed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            bookingStatus: { type: 'string' },
            paymentStatus: { type: 'string' },
            paymentTransactionId: { type: 'string' },
          },
        },
      },
    },
  })
  async confirmBookingAfterPayment(
    @Param('id') id: string,
    @Body() body: { paymentReference: string },
    @Request() req
  ) {
    // Verify ownership
    const booking = await this.bookingsService.findOne(id);
    if (booking.userId !== req.user.sub) {
      throw new BadRequestException('You can only confirm your own bookings');
    }

    const updatedBooking = await this.bookingsService.confirmBookingAfterPayment(
      id,
      body.paymentReference
    );

    return {
      success: true,
      message: 'Booking confirmed successfully',
        data: {
          id: updatedBooking.id,
          bookingStatus: updatedBooking.bookingStatus,
          paymentStatus: updatedBooking.paymentStatus,
          referenceNumber: updatedBooking.referenceNumber,
        },
    };
  }

  @Post(':id/create-payment-intent')
  @ApiOperation({ summary: 'Create payment intent for a pending inquiry' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            paymentIntent: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                clientSecret: { type: 'string' },
                status: { type: 'string' },
                requiresAction: { type: 'boolean' },
                nextAction: { type: 'object' },
              },
            },
            booking: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                totalPrice: { type: 'number' },
                referenceNumber: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - booking not found or not payable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPaymentIntentForInquiry(
    @Param('id') id: string,
    @Request() req
  ) {
    // Verify ownership
    const booking = await this.bookingsService.findOne(id);
    if (booking.userId !== req.user.sub) {
      throw new BadRequestException('You can only create payment intents for your own bookings');
    }

    // Check if booking is in a payable state
    if (booking.bookingStatus !== 'pending' && booking.bookingStatus !== 'priced') {
      throw new BadRequestException('Booking is not in a payable state');
    }

    if (booking.totalPrice <= 0) {
      throw new BadRequestException('Booking has no price set. Please contact support.');
    }

    if (booking.paymentStatus === 'paid') {
      throw new BadRequestException('Booking is already paid');
    }

    const result = await this.bookingsService.createPaymentIntentForInquiry(id);

    return {
      success: true,
      message: 'Payment intent created successfully',
      data: result,
    };
  }
}
