import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MpesaProvider, MpesaCallbackData } from './providers/mpesa.provider';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from '../../common/entities/payment.entity';

@ApiTags('mpesa-callbacks')
@Controller('mpesa-callbacks')
export class MpesaCallbackController {
  constructor(
    private readonly mpesaProvider: MpesaProvider,
    private readonly paymentsService: PaymentsService,
  ) {}

  // M-Pesa Callback Endpoint (Public - no authentication required)
  @Post('callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'M-Pesa payment callback' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Callback processed successfully' })
  async mpesaCallback(@Body() callbackData: MpesaCallbackData) {
    try {
      const paymentResult = await this.mpesaProvider.processCallback(callbackData);
      
      // Update payment status in database
      if (paymentResult.status === 'succeeded') {
        await this.paymentsService.updateStatus(
          paymentResult.id,
          PaymentStatus.COMPLETED,
          paymentResult.transactionId
        );
      } else if (paymentResult.status === 'failed') {
        await this.paymentsService.updateStatus(
          paymentResult.id,
          PaymentStatus.FAILED
        );
      }

      return {
        success: true,
        message: 'M-Pesa callback processed successfully',
        data: paymentResult,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to process M-Pesa callback',
        error: error.message,
      };
    }
  }
} 