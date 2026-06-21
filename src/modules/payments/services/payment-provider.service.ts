import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentConfirmationRequest,
  PaymentConfirmationResponse,
  PaymentProviderType,
} from '../interfaces/payment-provider.interface';
import { StripeProvider } from '../providers/stripe.provider';
import { MpesaProvider } from '../providers/mpesa.provider';
import { PaystackProvider } from '../providers/paystack.provider';

@Injectable()
export class PaymentProviderService {
  private readonly logger = new Logger(PaymentProviderService.name);
  private providers: Map<PaymentProviderType, PaymentProvider> = new Map();

  constructor(
    private configService: ConfigService,
    private stripeProvider: StripeProvider,
    private mpesaProvider: MpesaProvider,
    private paystackProvider: PaystackProvider,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Register Paystack provider as default
    this.providers.set(PaymentProviderType.PAYSTACK, this.paystackProvider);
    
    // Register Stripe provider as fallback
    this.providers.set(PaymentProviderType.STRIPE, this.stripeProvider);
    
    // Register M-Pesa provider as fallback
    this.providers.set(PaymentProviderType.MPESA, this.mpesaProvider);
    
    // Future providers can be added here
    // this.providers.set(PaymentProviderType.PAYPAL, this.paypalProvider);
  }

  getProvider(type: PaymentProviderType): PaymentProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Payment provider ${type} not found`);
    }
    return provider;
  }

  getDefaultProvider(): PaymentProvider {
    // Default to Paystack for new payments
    return this.getProvider(PaymentProviderType.PAYSTACK);
  }

  async createPaymentIntent(
    request: PaymentIntentRequest,
    providerType: PaymentProviderType = PaymentProviderType.PAYSTACK,
  ): Promise<PaymentIntentResponse> {
    const provider = this.getProvider(providerType);
    
    // Validate currency support
    if (!provider.supportedCurrencies.includes(request.currency.toUpperCase())) {
      throw new Error(`Currency ${request.currency} not supported by ${provider.name}`);
    }

    this.logger.log(`Creating payment intent with ${provider.name} for booking ${request.bookingId}`);
    
    try {
      const result = await provider.createPaymentIntent(request);
      this.logger.log(`Payment intent created: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create payment intent with ${provider.name}`, error);
      throw error;
    }
  }

  async confirmPayment(
    request: PaymentConfirmationRequest,
    providerType: PaymentProviderType = PaymentProviderType.PAYSTACK,
  ): Promise<PaymentConfirmationResponse> {
    const provider = this.getProvider(providerType);
    
    this.logger.log(`Confirming payment with ${provider.name}: ${request.paymentIntentId}`);
    
    try {
      const result = await provider.confirmPayment(request);
      this.logger.log(`Payment confirmed: ${result.id} - Status: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to confirm payment with ${provider.name}`, error);
      throw error;
    }
  }

  async getPaymentStatus(
    paymentIntentId: string,
    providerType: PaymentProviderType = PaymentProviderType.PAYSTACK,
  ): Promise<PaymentConfirmationResponse> {
    const provider = this.getProvider(providerType);
    
    try {
      const result = await provider.getPaymentStatus(paymentIntentId);
      this.logger.log(`Payment status retrieved: ${result.id} - Status: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get payment status with ${provider.name}`, error);
      throw error;
    }
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
    providerType: PaymentProviderType = PaymentProviderType.PAYSTACK,
  ): Promise<any> {
    const provider = this.getProvider(providerType);
    
    if (!provider.createRefund) {
      throw new Error(`Refunds not supported by ${provider.name}`);
    }

    this.logger.log(`Creating refund with ${provider.name}: ${paymentIntentId}`);
    
    try {
      const result = await provider.createRefund(paymentIntentId, amount, reason);
      this.logger.log(`Refund created: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create refund with ${provider.name}`, error);
      throw error;
    }
  }

  getSupportedProviders(): PaymentProviderType[] {
    return Array.from(this.providers.keys());
  }

  getProviderInfo(type: PaymentProviderType) {
    const provider = this.getProvider(type);
    return {
      name: provider.name,
      supportedCurrencies: provider.supportedCurrencies,
      supportedPaymentMethods: provider.supportedPaymentMethods,
    };
  }
} 