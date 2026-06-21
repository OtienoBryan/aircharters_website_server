import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  HttpStatus, 
  ParseIntPipe,
  Request,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { PaymentProviderService } from './services/payment-provider.service';
import { CreatePaymentDto } from './dto';
import { PaymentStatus } from '../../common/entities/payment.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../common/entities/user.entity';
import { PaymentProviderType } from './interfaces/payment-provider.interface';
import { MpesaProvider, MpesaCallbackData } from './providers/mpesa.provider';
import { RateLimit, RateLimitConfigs } from '../../common/decorators/rate-limit.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly mpesaProvider: MpesaProvider,
  ) {}

  @Post('create-intent')
  @RateLimit(RateLimitConfigs.PAYMENT)
  @ApiOperation({ summary: 'Create a payment intent for booking' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Payment intent created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid payment data' })
  async createPaymentIntent(
    @CurrentUser() user: User,
    @Body() body: {
      bookingId: string;
      amount: number;
      currency?: string;
      paymentMethod?: string;
    },
  ) {
    const paymentIntent = await this.paymentProviderService.createPaymentIntent({
      amount: body.amount,
      currency: body.currency || 'USD',
      bookingId: body.bookingId,
      userId: user.id,
      description: `Payment for booking ${body.bookingId}`,
      metadata: {
        paymentMethod: body.paymentMethod,
      },
    });

    return {
      success: true,
      message: 'Payment intent created successfully',
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        status: paymentIntent.status,
        requiresAction: paymentIntent.requiresAction,
        nextAction: paymentIntent.nextAction,
      },
    };
  }

  @Post('confirm')
  @RateLimit(RateLimitConfigs.PAYMENT)
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Payment confirmation failed' })
  async confirmPayment(
    @CurrentUser() user: User,
    @Body() body: {
      paymentIntentId: string;
      paymentMethodId?: string;
    },
  ) {
    const payment = await this.paymentProviderService.confirmPayment({
      paymentIntentId: body.paymentIntentId,
      paymentMethodId: body.paymentMethodId,
    });

    return {
      success: true,
      message: 'Payment confirmed successfully',
      data: payment,
    };
  }

  @Get('status/:paymentIntentId')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment status retrieved successfully' })
  async getPaymentStatus(@Param('paymentIntentId') paymentIntentId: string) {
    const payment = await this.paymentProviderService.getPaymentStatus(paymentIntentId);

    return {
      success: true,
      data: payment,
    };
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get available payment providers' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment providers retrieved successfully' })
  async getPaymentProviders() {
    const providers = this.paymentProviderService.getSupportedProviders();
    const providerInfo = providers.map(type => 
      this.paymentProviderService.getProviderInfo(type)
    );

    return {
      success: true,
      data: {
        providers: providerInfo,
        defaultProvider: PaymentProviderType.PAYSTACK,
      },
    };
  }

  @Post('refund/:paymentIntentId')
  @ApiOperation({ summary: 'Create a refund' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund created successfully' })
  async createRefund(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: {
      amount?: number;
      reason?: string;
    },
  ) {
    const refund = await this.paymentProviderService.createRefund(
      paymentIntentId,
      body.amount,
      body.reason,
    );

    return {
      success: true,
      message: 'Refund created successfully',
      data: refund,
    };
  }

  // Legacy endpoints for backward compatibility
  @Post()
  @ApiOperation({ summary: 'Create a new payment (Legacy)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Payment created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid payment data' })
  async create(
    @CurrentUser() user: User,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    const payment = await this.paymentsService.createFromBooking(user.id, createPaymentDto);
    return {
      success: true,
      message: 'Payment created successfully',
      data: payment,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments for current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payments retrieved successfully' })
  async findUserPayments(@CurrentUser() user: User) {
    const payments = await this.paymentsService.findByUser(user.id);
    return {
      success: true,
      data: payments,
    };
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get payments for a specific booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking payments retrieved successfully' })
  async findByBooking(@Param('bookingId') bookingId: string) {
    const payments = await this.paymentsService.findByBooking(bookingId);
    return {
      success: true,
      data: payments,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment stats retrieved successfully' })
  async getStats(@Query('companyId') companyId?: number) {
    const stats = await this.paymentsService.getPaymentStats(companyId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Payment not found' })
  async findOne(@Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);
    return {
      success: true,
      data: payment,
    };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment status updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Payment not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateData: { status: PaymentStatus; transactionId?: string },
  ) {
    const payment = await this.paymentsService.updateStatus(
      id, 
      updateData.status, 
      updateData.transactionId
    );
    return {
      success: true,
      message: 'Payment status updated successfully',
      data: payment,
    };
  }

  @Put(':id/gateway-response')
  @ApiOperation({ summary: 'Update payment gateway response' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Gateway response updated successfully' })
  async updateGatewayResponse(
    @Param('id') id: string,
    @Body() gatewayResponse: any,
  ) {
    const payment = await this.paymentsService.updateGatewayResponse(id, gatewayResponse);
    return {
      success: true,
      message: 'Gateway response updated successfully',
      data: payment,
    };
  }

  @Put(':id/refund')
  @ApiOperation({ summary: 'Process payment refund (Legacy)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund processed successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Payment cannot be refunded' })
  async refund(@Param('id') id: string) {
    const payment = await this.paymentsService.processRefund(id);
    return {
      success: true,
      message: 'Refund processed successfully',
      data: payment,
    };
  }



  // M-Pesa STK Push Endpoint
  @Post('mpesa/stk-push')
  @ApiOperation({ summary: 'Initiate M-Pesa STK Push payment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'STK Push initiated successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'STK Push failed' })
  async initiateMpesaPayment(
    @CurrentUser() user: User,
    @Body() body: {
      bookingId: string;
      amount: number;
      phoneNumber: string;
      description?: string;
    },
  ) {
    const paymentIntent = await this.paymentProviderService.createPaymentIntent(
      {
        amount: body.amount,
        currency: 'KES',
        bookingId: body.bookingId,
        userId: user.id,
        description: body.description || `Payment for booking ${body.bookingId}`,
        metadata: {
          phoneNumber: body.phoneNumber,
        },
      },
      PaymentProviderType.MPESA
    );

    return {
      success: true,
      message: 'M-Pesa STK Push initiated successfully',
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        requiresAction: paymentIntent.requiresAction,
        nextAction: paymentIntent.nextAction,
      },
    };
  }
} 