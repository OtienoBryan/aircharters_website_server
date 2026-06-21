import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe, Req, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { MpesaMerchantProvider, SplitPaymentRequest } from '../providers/mpesa-merchant.provider';
import { PaymentProvider } from '../../../common/entities/company-payment-account.entity';
import { Request, Response } from 'express';

@ApiTags('M-Pesa Merchant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mpesa-merchant')
export class MpesaMerchantController {
  private readonly logger = new Logger(MpesaMerchantController.name);

  constructor(
    private readonly mpesaMerchantProvider: MpesaMerchantProvider,
  ) {}

  @Post('split-payment')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Create M-Pesa split payment with STK Push' })
  @ApiResponse({ status: 201, description: 'Split payment initiated successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in KES' },
        phoneNumber: { type: 'string' },
        businessShortCode: { type: 'string' },
        accountReference: { type: 'string' },
        transactionDesc: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            companyId: { type: 'number' },
            platformFee: { type: 'number' },
            companyAmount: { type: 'number' },
            bookingId: { type: 'string' },
          },
        },
      },
      required: ['amount', 'phoneNumber', 'businessShortCode', 'accountReference', 'transactionDesc', 'metadata'],
    },
  })
  async createSplitPayment(@Body() request: SplitPaymentRequest) {
    const result = await this.mpesaMerchantProvider.createSplitPayment(request);
    return {
      success: true,
      message: 'M-Pesa split payment initiated successfully',
      data: result,
    };
  }

  @Get('payment-status/:checkoutRequestId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Check M-Pesa payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  async checkPaymentStatus(@Param('checkoutRequestId') checkoutRequestId: string) {
    const status = await this.mpesaMerchantProvider.checkPaymentStatus(checkoutRequestId);
    return {
      success: true,
      data: status,
    };
  }

  @Post('process-split/:transactionId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Process split payment after successful transaction' })
  @ApiResponse({ status: 200, description: 'Split payment processed successfully' })
  async processSplitPayment(
    @Param('transactionId') transactionId: string,
    @Body() body: {
      platformAccount: string;
      companyAccount: string;
      platformAmount: number;
      companyAmount: number;
    },
  ) {
    const result = await this.mpesaMerchantProvider.processSplitPayment(
      transactionId,
      body.platformAccount,
      body.companyAccount,
      body.platformAmount,
      body.companyAmount,
    );
    return {
      success: true,
      message: 'Split payment processed successfully',
      data: result,
    };
  }

  @Get('merchant-balance/:merchantId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get M-Pesa merchant account balance' })
  @ApiResponse({ status: 200, description: 'Merchant balance retrieved successfully' })
  async getMerchantBalance(@Param('merchantId') merchantId: string) {
    const balance = await this.mpesaMerchantProvider.getMerchantBalance(merchantId);
    return {
      success: true,
      data: balance,
    };
  }

  @Get('merchant-transactions/:merchantId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get M-Pesa merchant transactions' })
  @ApiResponse({ status: 200, description: 'Merchant transactions retrieved successfully' })
  async getMerchantTransactions(
    @Param('merchantId') merchantId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const transactions = await this.mpesaMerchantProvider.getMerchantTransactions(
      merchantId,
      fromDate,
      toDate,
    );
    return {
      success: true,
      data: transactions,
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle M-Pesa webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const payload = req.body;

    try {
      const result = await this.mpesaMerchantProvider.handleWebhook(payload);
      return res.status(200).json({ received: true, result });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('split-callback')
  @ApiOperation({ summary: 'Handle M-Pesa split payment callback' })
  @ApiResponse({ status: 200, description: 'Split payment callback processed successfully' })
  async handleSplitCallback(@Req() req: Request, @Res() res: Response) {
    const payload = req.body;

    try {
      // Extract metadata from callback
      const metadata = payload.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'Metadata'
      )?.Value;

      if (metadata) {
        const companyId = metadata.companyId;
        const platformFee = metadata.platformFee;
        const companyAmount = metadata.companyAmount;
        const bookingId = metadata.bookingId;

        // Process the split payment
        if (payload.ResultCode === '0') {
          // Payment successful, process split
          const splitResult = await this.mpesaMerchantProvider.processSplitPayment(
            payload.CheckoutRequestID,
            'PLATFORM_ACCOUNT', // Platform account ID
            `COMPANY_${companyId}`, // Company account ID
            platformFee,
            companyAmount,
          );

          // Update booking status
          // await this.bookingService.updatePaymentStatus(bookingId, 'completed');

          return res.status(200).json({
            success: true,
            message: 'Split payment processed successfully',
            data: splitResult,
          });
        } else {
          // Payment failed
          // await this.bookingService.updatePaymentStatus(bookingId, 'failed');

          return res.status(200).json({
            success: false,
            message: 'Payment failed',
            error: payload.ResultDesc,
          });
        }
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error('M-Pesa split callback processing failed', error);
      return res.status(400).json({ error: error.message });
    }
  }
}
