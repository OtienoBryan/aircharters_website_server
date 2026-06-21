import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentConfirmationRequest,
  PaymentConfirmationResponse,
  PaymentProviderType,
} from '../interfaces/payment-provider.interface';

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  businessShortCode: string;
  environment: 'sandbox' | 'live';
}

export interface MpesaStkPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

export interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

@Injectable()
export class MpesaProvider implements PaymentProvider {
  private readonly logger = new Logger(MpesaProvider.name);
  private readonly config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  public readonly name = 'M-Pesa';
  public readonly supportedCurrencies = ['KES'];
  public readonly supportedPaymentMethods = ['mobile_money'];

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.config = {
      consumerKey: this.configService.get<string>('MPESA_CONSUMER_KEY'),
      consumerSecret: this.configService.get<string>('MPESA_CONSUMER_SECRET'),
      passkey: this.configService.get<string>('MPESA_PASSKEY'),
      businessShortCode: this.configService.get<string>('MPESA_BUSINESS_SHORT_CODE'),
      environment: this.configService.get<string>('MPESA_ENVIRONMENT') as 'sandbox' | 'live' || 'sandbox',
    };

    this.validateConfig();
  }

  private validateConfig() {
    const requiredFields = ['consumerKey', 'consumerSecret', 'passkey', 'businessShortCode'];
    for (const field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`M-Pesa ${field} is not configured`);
      }
    }
  }

  private getBaseUrl(): string {
    return this.config.environment === 'live'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Check if we have a valid token
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const authUrl = `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;
      const authString = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      
      const response = await firstValueFrom(
        this.httpService.get(authUrl, {
          headers: {
            Authorization: `Basic ${authString}`,
          },
        })
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = now + (response.data.expires_in * 1000) - 60000; // Expire 1 minute early
      
      this.logger.log('M-Pesa access token refreshed');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get M-Pesa access token', error);
      throw new HttpException('Failed to authenticate with M-Pesa', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private generatePassword(): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${this.config.businessShortCode}${this.config.passkey}${timestamp}`).toString('base64');
    return password;
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const password = this.generatePassword();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);

      // Extract phone number from metadata or use a default
      const phoneNumber = request.metadata?.phoneNumber || request.metadata?.phone || '254700000000';
      
      // Format phone number (remove + and ensure it starts with 254)
      const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');

      const stkPushRequest: MpesaStkPushRequest = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount), // M-Pesa expects whole numbers
        PartyA: formattedPhone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${this.configService.get<string>('APP_URL')}/api/payments/mpesa/callback`,
        AccountReference: request.bookingId,
        TransactionDesc: request.description,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
          stkPushRequest,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      const result: MpesaStkPushResponse = response.data;

      if (result.ResponseCode !== '0') {
        throw new HttpException(
          `M-Pesa STK Push failed: ${result.ResponseDescription}`,
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`M-Pesa STK Push initiated: ${result.CheckoutRequestID}`);

      return {
        id: result.CheckoutRequestID,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        paymentMethod: 'mobile_money',
        requiresAction: true,
        nextAction: {
          type: 'mpesa_stk_push',
          message: result.CustomerMessage,
          checkoutRequestId: result.CheckoutRequestID,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create M-Pesa payment intent', error);
      throw error;
    }
  }

  async confirmPayment(request: PaymentConfirmationRequest): Promise<PaymentConfirmationResponse> {
    // For M-Pesa, confirmation happens via callback
    // This method checks the payment status
    return this.getPaymentStatus(request.paymentIntentId);
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentConfirmationResponse> {
    try {
      // In a real implementation, you would query your database for the payment status
      // For now, we'll return a pending status since M-Pesa uses callbacks
      
      return {
        id: paymentIntentId,
        status: 'pending',
        amount: 0, // Will be updated via callback
        currency: 'KES',
        transactionId: paymentIntentId,
        paymentMethod: 'mobile_money',
      };
    } catch (error) {
      this.logger.error('Failed to get M-Pesa payment status', error);
      throw error;
    }
  }

  async processCallback(callbackData: MpesaCallbackData): Promise<PaymentConfirmationResponse> {
    const stkCallback = callbackData.Body.stkCallback;
    
    this.logger.log(`M-Pesa callback received: ${stkCallback.CheckoutRequestID}`);

    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata?.Item.reduce((acc, item) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {} as Record<string, any>);

      return {
        id: stkCallback.CheckoutRequestID,
        status: 'succeeded',
        amount: metadata?.Amount || 0,
        currency: 'KES',
        transactionId: metadata?.MpesaReceiptNumber || stkCallback.CheckoutRequestID,
        paymentMethod: 'mobile_money',
        metadata: {
          mpesaReceiptNumber: metadata?.MpesaReceiptNumber,
          transactionDate: metadata?.TransactionDate,
          phoneNumber: metadata?.PhoneNumber,
        },
      };
    } else {
      // Payment failed
      return {
        id: stkCallback.CheckoutRequestID,
        status: 'failed',
        amount: 0,
        currency: 'KES',
        transactionId: stkCallback.CheckoutRequestID,
        paymentMethod: 'mobile_money',
        metadata: {
          errorCode: stkCallback.ResultCode,
          errorDescription: stkCallback.ResultDesc,
        },
      };
    }
  }

  async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
    // M-Pesa refunds are typically handled manually or through their API
    // This is a placeholder implementation
    this.logger.log(`M-Pesa refund requested for: ${paymentIntentId}`);
    
    return {
      id: `refund_${Date.now()}`,
      status: 'pending',
      amount: amount || 0,
      currency: 'KES',
      reason: reason || 'Customer request',
    };
  }
} 