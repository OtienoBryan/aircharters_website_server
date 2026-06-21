import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CompanyPaymentAccount, AccountType, AccountStatus } from '../../../common/entities/company-payment-account.entity';

export interface StripeConnectConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  clientId: string; // Stripe Connect client ID
}

export interface CreateConnectAccountDto {
  companyId: number;
  email: string;
  country: string;
  businessType: string;
  companyName: string;
  phone?: string;
}

export interface ConnectAccountResponse {
  accountId: string;
  onboardingUrl?: string;
  dashboardUrl?: string;
  requirements?: any;
  capabilities?: any;
}

export interface SplitPaymentRequest {
  amount: number; // Amount in cents
  currency: string;
  companyAccountId: string;
  platformFeeAmount: number; // Platform fee in cents
  description: string;
  metadata: any;
  customerId?: string;
  paymentMethodId?: string;
}

export interface SplitPaymentResponse {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  amount: number;
  platformFee: number;
  companyAmount: number;
  requiresAction: boolean;
  nextAction?: any;
}

@Injectable()
export class StripeConnectProvider {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeConnectProvider.name);
  private readonly config: StripeConnectConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      secretKey: this.configService.get<string>('STRIPE_SECRET_KEY'),
      publishableKey: this.configService.get<string>('STRIPE_PUBLISHABLE_KEY'),
      webhookSecret: this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
      clientId: this.configService.get<string>('STRIPE_CONNECT_CLIENT_ID'),
    };

    if (!this.config.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(this.config.secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async createConnectAccount(dto: CreateConnectAccountDto): Promise<ConnectAccountResponse> {
    try {
      this.logger.log(`Creating Stripe Connect account for company ${dto.companyId}`);

      const account = await this.stripe.accounts.create({
        type: 'express',
        country: dto.country,
        email: dto.email,
        business_type: 'company',
        company: {
          name: dto.companyName,
          phone: dto.phone,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          url: `https://yourplatform.com/company/${dto.companyId}`,
          mcc: '4511', // Air transportation
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: '127.0.0.1', // Will be updated with actual IP
        },
      });

      // Create onboarding link
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${this.configService.get<string>('FRONTEND_URL')}/company/onboarding/refresh`,
        return_url: `${this.configService.get<string>('FRONTEND_URL')}/company/onboarding/complete`,
        type: 'account_onboarding',
      });

      this.logger.log(`Stripe Connect account created: ${account.id}`);

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
        dashboardUrl: (account as any).dashboard_url,
        requirements: account.requirements,
        capabilities: account.capabilities,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe Connect account', error);
      throw new HttpException(
        `Failed to create Stripe Connect account: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getConnectAccount(accountId: string): Promise<any> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      return account;
    } catch (error) {
      this.logger.error(`Failed to retrieve Stripe Connect account ${accountId}`, error);
      throw new HttpException(
        `Failed to retrieve Stripe Connect account: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createSplitPayment(request: SplitPaymentRequest): Promise<SplitPaymentResponse> {
    try {
      this.logger.log(`Creating split payment: ${request.amount} ${request.currency} for company ${request.companyAccountId}`);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency.toLowerCase(),
        application_fee_amount: request.platformFeeAmount,
        transfer_data: {
          destination: request.companyAccountId,
        },
        description: request.description,
        metadata: request.metadata,
        customer: request.customerId,
        payment_method: request.paymentMethodId,
        automatic_payment_methods: {
          enabled: true,
        },
        confirm: false, // Don't confirm immediately, let frontend handle
      });

      const companyAmount = request.amount - request.platformFeeAmount;

      this.logger.log(`Split payment created: ${paymentIntent.id}`);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: request.amount,
        platformFee: request.platformFeeAmount,
        companyAmount: companyAmount,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
      };
    } catch (error) {
      this.logger.error('Failed to create split payment', error);
      throw new HttpException(
        `Failed to create split payment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async confirmSplitPayment(paymentIntentId: string, paymentMethodId?: string): Promise<any> {
    try {
      this.logger.log(`Confirming split payment: ${paymentIntentId}`);

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'requires_confirmation') {
        await this.stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: paymentMethodId,
        });
      }

      const updatedPaymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      this.logger.log(`Split payment confirmed: ${paymentIntentId} - Status: ${updatedPaymentIntent.status}`);

      return {
        id: updatedPaymentIntent.id,
        status: updatedPaymentIntent.status,
        amount: updatedPaymentIntent.amount,
        currency: updatedPaymentIntent.currency,
        applicationFee: updatedPaymentIntent.application_fee_amount,
        transferData: updatedPaymentIntent.transfer_data,
        charges: (updatedPaymentIntent as any).charges,
      };
    } catch (error) {
      this.logger.error('Failed to confirm split payment', error);
      throw new HttpException(
        `Failed to confirm split payment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAccountBalance(accountId: string): Promise<any> {
    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: accountId,
      });

      return {
        available: balance.available,
        pending: balance.pending,
        instantAvailable: balance.instant_available,
      };
    } catch (error) {
      this.logger.error(`Failed to get account balance for ${accountId}`, error);
      throw new HttpException(
        `Failed to get account balance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTransfer(accountId: string, amount: number, currency: string, description: string): Promise<any> {
    try {
      this.logger.log(`Creating transfer: ${amount} ${currency} to account ${accountId}`);

      const transfer = await this.stripe.transfers.create({
        amount: amount,
        currency: currency.toLowerCase(),
        destination: accountId,
        description: description,
      });

      this.logger.log(`Transfer created: ${transfer.id}`);

      return transfer;
    } catch (error) {
      this.logger.error('Failed to create transfer', error);
      throw new HttpException(
        `Failed to create transfer: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAccountPayouts(accountId: string, limit: number = 10): Promise<any[]> {
    try {
      const payouts = await this.stripe.payouts.list(
        {
          limit: limit,
        },
        {
          stripeAccount: accountId,
        }
      );

      return payouts.data;
    } catch (error) {
      this.logger.error(`Failed to get payouts for account ${accountId}`, error);
      throw new HttpException(
        `Failed to get payouts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      this.logger.error(`Failed to create account link for ${accountId}`, error);
      throw new HttpException(
        `Failed to create account link: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handleWebhook(payload: string, signature: string): Promise<any> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret,
      );

      this.logger.log(`Webhook received: ${event.type}`);

      switch (event.type) {
        case 'account.updated':
          return this.handleAccountUpdated(event.data.object);
        case 'payment_intent.succeeded':
          return this.handlePaymentSucceeded(event.data.object);
        case 'payment_intent.payment_failed':
          return this.handlePaymentFailed(event.data.object);
        case 'transfer.created':
          return this.handleTransferCreated(event.data.object);
        case 'payout.paid':
          return this.handlePayoutPaid(event.data.object);
        default:
          this.logger.log(`Unhandled webhook event: ${event.type}`);
          return null;
      }
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new HttpException('Webhook signature verification failed', HttpStatus.BAD_REQUEST);
    }
  }

  private async handleAccountUpdated(account: any): Promise<void> {
    this.logger.log(`Account updated: ${account.id} - Status: ${account.charges_enabled}`);
    // Update company payment account status in database
  }

  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id} - Amount: ${paymentIntent.amount}`);
    // Update booking status and trigger company payout
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);
    // Update booking status and notify user
  }

  private async handleTransferCreated(transfer: any): Promise<void> {
    this.logger.log(`Transfer created: ${transfer.id} - Amount: ${transfer.amount}`);
    // Update company balance and log transfer
  }

  private async handlePayoutPaid(payout: any): Promise<void> {
    this.logger.log(`Payout paid: ${payout.id} - Amount: ${payout.amount}`);
    // Update company payout records
  }
}
