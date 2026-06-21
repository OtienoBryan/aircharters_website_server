import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentConfirmationRequest,
  PaymentConfirmationResponse,
  PaymentMethod,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  public readonly name = 'Stripe';
  public readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  public readonly supportedPaymentMethods = [
    'card',
    'apple_pay',
    'google_pay',
    'bank_transfer',
    'us_bank_account',
  ];

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        metadata: {
          bookingId: request.bookingId,
          userId: request.userId,
          ...request.metadata,
        },
        description: request.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: request.amount,
        currency: request.currency,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe payment intent', error);
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  async confirmPayment(request: PaymentConfirmationRequest): Promise<PaymentConfirmationResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(request.paymentIntentId);
      
      if (paymentIntent.status === 'requires_confirmation') {
        await this.stripe.paymentIntents.confirm(request.paymentIntentId, {
          payment_method: request.paymentMethodId,
        });
      }

      const updatedPaymentIntent = await this.stripe.paymentIntents.retrieve(request.paymentIntentId);

      return {
        id: updatedPaymentIntent.id,
        status: updatedPaymentIntent.status as any,
        amount: updatedPaymentIntent.amount / 100, // Convert from cents
        currency: updatedPaymentIntent.currency.toUpperCase(),
        transactionId: updatedPaymentIntent.latest_charge as string,
        paymentMethod: updatedPaymentIntent.payment_method_types?.[0] || 'unknown',
        metadata: updatedPaymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to confirm Stripe payment', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentConfirmationResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      const charge = paymentIntent.latest_charge 
        ? await this.stripe.charges.retrieve(paymentIntent.latest_charge as string)
        : null;

      return {
        id: paymentIntent.id,
        status: paymentIntent.status as any,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        transactionId: charge?.id || paymentIntent.id,
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'unknown',
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to get Stripe payment status', error);
      throw new Error(`Payment status retrieval failed: ${error.message}`);
    }
  }

  async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      const charge = paymentIntent.latest_charge as string;

      const refund = await this.stripe.refunds.create({
        charge,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as any,
        metadata: {
          paymentIntentId,
          reason,
        },
      });

      return {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        reason: refund.reason,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe refund', error);
      throw new Error(`Refund creation failed: ${error.message}`);
    }
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: userId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
      }));
    } catch (error) {
      this.logger.error('Failed to get Stripe payment methods', error);
      return [];
    }
  }

  async savePaymentMethod(userId: string, paymentMethodData: any): Promise<PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodData.paymentMethodId,
        { customer: userId }
      );

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
      };
    } catch (error) {
      this.logger.error('Failed to save Stripe payment method', error);
      throw new Error(`Payment method save failed: ${error.message}`);
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete Stripe payment method', error);
      return false;
    }
  }
} 