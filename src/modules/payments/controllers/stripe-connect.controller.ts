import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CompanyOnboardingService, OnboardCompanyDto } from '../services/company-onboarding.service';
import { StripeConnectProvider, SplitPaymentRequest } from '../providers/stripe-connect.provider';
import { PaymentProvider, AccountType } from '../../../common/entities/company-payment-account.entity';
import { Request, Response } from 'express';

@ApiTags('Stripe Connect')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stripe-connect')
export class StripeConnectController {
  constructor(
    private readonly companyOnboardingService: CompanyOnboardingService,
    private readonly stripeConnectProvider: StripeConnectProvider,
  ) {}

  @Post('onboard')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Onboard a company to Stripe Connect' })
  @ApiResponse({ status: 201, description: 'Company onboarded successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyId: { type: 'number' },
        paymentProvider: { type: 'string', enum: ['stripe', 'mpesa'] },
        accountType: { type: 'string', enum: ['express', 'custom', 'standard'] },
        country: { type: 'string' },
        currency: { type: 'string' },
      },
      required: ['companyId', 'paymentProvider', 'country'],
    },
  })
  async onboardCompany(@Body() dto: OnboardCompanyDto) {
    const result = await this.companyOnboardingService.onboardCompany(dto);
    return {
      success: true,
      message: 'Company onboarding initiated successfully',
      data: result,
    };
  }

  @Get('onboarding-status/:companyId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get company onboarding status' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved successfully' })
  async getOnboardingStatus(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('provider') provider: PaymentProvider = PaymentProvider.STRIPE,
  ) {
    const status = await this.companyOnboardingService.getOnboardingStatus(companyId, provider);
    return {
      success: true,
      data: status,
    };
  }

  @Post('refresh-onboarding/:companyId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Refresh onboarding link for company' })
  @ApiResponse({ status: 200, description: 'Onboarding link refreshed successfully' })
  async refreshOnboardingLink(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('provider') provider: PaymentProvider = PaymentProvider.STRIPE,
  ) {
    const onboardingUrl = await this.companyOnboardingService.refreshOnboardingLink(companyId, provider);
    return {
      success: true,
      message: 'Onboarding link refreshed successfully',
      data: { onboardingUrl },
    };
  }

  @Get('company-accounts/:companyId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get all payment accounts for a company' })
  @ApiResponse({ status: 200, description: 'Company payment accounts retrieved successfully' })
  async getCompanyPaymentAccounts(@Param('companyId', ParseIntPipe) companyId: number) {
    const accounts = await this.companyOnboardingService.getCompanyPaymentAccounts(companyId);
    return {
      success: true,
      data: accounts,
    };
  }

  @Post('split-payment')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Create a split payment with platform fee' })
  @ApiResponse({ status: 201, description: 'Split payment created successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in cents' },
        currency: { type: 'string' },
        companyAccountId: { type: 'string' },
        platformFeeAmount: { type: 'number', description: 'Platform fee in cents' },
        description: { type: 'string' },
        metadata: { type: 'object' },
        customerId: { type: 'string' },
        paymentMethodId: { type: 'string' },
      },
      required: ['amount', 'currency', 'companyAccountId', 'platformFeeAmount', 'description'],
    },
  })
  async createSplitPayment(@Body() request: SplitPaymentRequest) {
    const result = await this.stripeConnectProvider.createSplitPayment(request);
    return {
      success: true,
      message: 'Split payment created successfully',
      data: result,
    };
  }

  @Post('confirm-payment/:paymentIntentId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Confirm a split payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  async confirmSplitPayment(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: { paymentMethodId?: string },
  ) {
    const result = await this.stripeConnectProvider.confirmSplitPayment(paymentIntentId, body.paymentMethodId);
    return {
      success: true,
      message: 'Payment confirmed successfully',
      data: result,
    };
  }

  @Get('account-balance/:accountId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get Stripe Connect account balance' })
  @ApiResponse({ status: 200, description: 'Account balance retrieved successfully' })
  async getAccountBalance(@Param('accountId') accountId: string) {
    const balance = await this.stripeConnectProvider.getAccountBalance(accountId);
    return {
      success: true,
      data: balance,
    };
  }

  @Get('account-payouts/:accountId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get account payouts' })
  @ApiResponse({ status: 200, description: 'Account payouts retrieved successfully' })
  async getAccountPayouts(
    @Param('accountId') accountId: string,
    @Query('limit') limit: number = 10,
  ) {
    const payouts = await this.stripeConnectProvider.getAccountPayouts(accountId, limit);
    return {
      success: true,
      data: payouts,
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
      const result = await this.stripeConnectProvider.handleWebhook(payload, signature);
      return res.status(200).json({ received: true, result });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('deactivate-account/:accountId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Deactivate a payment account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  async deactivateAccount(@Param('accountId') accountId: string) {
    await this.companyOnboardingService.deactivateAccount(accountId);
    return {
      success: true,
      message: 'Account deactivated successfully',
    };
  }
}
