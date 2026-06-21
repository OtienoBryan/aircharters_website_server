import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface MpesaMerchantConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  businessShortCode: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
}

export interface CreateMerchantAccountDto {
  companyId: number;
  businessName: string;
  phoneNumber: string;
  businessType: string;
  documents: any[];
  bankAccount?: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  };
}

export interface MerchantAccountResponse {
  merchantId: string;
  businessShortCode: string;
  status: string;
  verificationStatus: string;
  requirements?: any;
}

export interface SplitPaymentRequest {
  amount: number; // Amount in KES
  phoneNumber: string;
  businessShortCode: string;
  accountReference: string;
  transactionDesc: string;
  metadata: {
    companyId: number;
    platformFee: number;
    companyAmount: number;
    bookingId: string;
  };
}

export interface SplitPaymentResponse {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
  amount: number;
  platformFee: number;
  companyAmount: number;
  requiresAction: boolean;
}

export interface PaymentStatus {
  checkoutRequestId: string;
  resultCode: string;
  resultDesc: string;
  amount: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

@Injectable()
export class MpesaMerchantProvider {
  private readonly logger = new Logger(MpesaMerchantProvider.name);
  private readonly config: MpesaMerchantConfig;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.config = {
      consumerKey: this.configService.get<string>('MPESA_CONSUMER_KEY'),
      consumerSecret: this.configService.get<string>('MPESA_CONSUMER_SECRET'),
      passkey: this.configService.get<string>('MPESA_PASSKEY'),
      businessShortCode: this.configService.get<string>('MPESA_BUSINESS_SHORTCODE'),
      environment: this.configService.get<string>('MPESA_ENVIRONMENT') as 'sandbox' | 'production',
      callbackUrl: this.configService.get<string>('MPESA_CALLBACK_URL'),
    };

    this.baseUrl = this.config.environment === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    if (!this.config.consumerKey || !this.config.consumerSecret) {
      throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required');
    }
  }

  async createMerchantAccount(dto: CreateMerchantAccountDto): Promise<MerchantAccountResponse> {
    try {
      this.logger.log(`Creating M-Pesa merchant account for company ${dto.companyId}`);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Register merchant with M-Pesa
      const merchantResponse = await this.registerMerchant(dto, accessToken);

      // Generate business shortcode for the merchant
      const shortCode = await this.generateBusinessShortCode(merchantResponse.merchantId, accessToken);

      this.logger.log(`M-Pesa merchant account created: ${merchantResponse.merchantId}`);

      return {
        merchantId: merchantResponse.merchantId,
        businessShortCode: shortCode,
        status: 'pending',
        verificationStatus: 'pending',
        requirements: merchantResponse.requirements,
      };
    } catch (error) {
      this.logger.error('Failed to create M-Pesa merchant account', error);
      throw new HttpException(
        `Failed to create M-Pesa merchant account: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createSplitPayment(request: SplitPaymentRequest): Promise<SplitPaymentResponse> {
    try {
      this.logger.log(`Creating M-Pesa split payment: ${request.amount} KES for company ${request.metadata.companyId}`);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate timestamp
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // Prepare STK Push request
      const stkPushData = {
        BusinessShortCode: request.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: request.amount,
        PartyA: request.phoneNumber,
        PartyB: request.businessShortCode,
        PhoneNumber: request.phoneNumber,
        CallBackURL: `${this.config.callbackUrl}/mpesa/split-callback`,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc,
        Metadata: {
          companyId: request.metadata.companyId,
          platformFee: request.metadata.platformFee,
          companyAmount: request.metadata.companyAmount,
          bookingId: request.metadata.bookingId,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = response.data;

      if (responseData.ResponseCode !== '0') {
        throw new Error(`STK Push failed: ${responseData.ResponseDescription}`);
      }

      this.logger.log(`M-Pesa split payment initiated: ${responseData.CheckoutRequestID}`);

      return {
        checkoutRequestId: responseData.CheckoutRequestID,
        merchantRequestId: responseData.MerchantRequestID,
        responseCode: responseData.ResponseCode,
        responseDescription: responseData.ResponseDescription,
        customerMessage: responseData.CustomerMessage,
        amount: request.amount,
        platformFee: request.metadata.platformFee,
        companyAmount: request.metadata.companyAmount,
        requiresAction: true,
      };
    } catch (error) {
      this.logger.error('Failed to create M-Pesa split payment', error);
      throw new HttpException(
        `Failed to create M-Pesa split payment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkPaymentStatus(checkoutRequestId: string): Promise<PaymentStatus> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const queryData = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = response.data;

      return {
        checkoutRequestId: responseData.CheckoutRequestID,
        resultCode: responseData.ResultCode,
        resultDesc: responseData.ResultDesc,
        amount: responseData.Amount,
        mpesaReceiptNumber: responseData.MpesaReceiptNumber,
        transactionDate: responseData.TransactionDate,
        phoneNumber: responseData.PhoneNumber,
      };
    } catch (error) {
      this.logger.error(`Failed to check payment status for ${checkoutRequestId}`, error);
      throw new HttpException(
        `Failed to check payment status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processSplitPayment(
    transactionId: string,
    platformAccount: string,
    companyAccount: string,
    platformAmount: number,
    companyAmount: number,
  ): Promise<any> {
    try {
      this.logger.log(`Processing split payment: Platform ${platformAmount}, Company ${companyAmount}`);

      const accessToken = await this.getAccessToken();

      // Process platform fee deduction
      const platformTransfer = await this.transferToAccount(
        platformAccount,
        platformAmount,
        `Platform fee for transaction ${transactionId}`,
        accessToken,
      );

      // Process company payout
      const companyTransfer = await this.transferToAccount(
        companyAccount,
        companyAmount,
        `Company payout for transaction ${transactionId}`,
        accessToken,
      );

      return {
        platformTransfer,
        companyTransfer,
        transactionId,
        totalAmount: platformAmount + companyAmount,
      };
    } catch (error) {
      this.logger.error('Failed to process split payment', error);
      throw new HttpException(
        `Failed to process split payment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMerchantBalance(merchantId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/mpesa/accountbalance/v1/query`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            BusinessShortCode: merchantId,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get merchant balance for ${merchantId}`, error);
      throw new HttpException(
        `Failed to get merchant balance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMerchantTransactions(merchantId: string, fromDate: string, toDate: string): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/mpesa/transactionstatus/v1/query`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            BusinessShortCode: merchantId,
            FromDate: fromDate,
            ToDate: toDate,
          },
        }
      );

      return response.data.Transactions || [];
    } catch (error) {
      this.logger.error(`Failed to get merchant transactions for ${merchantId}`, error);
      throw new HttpException(
        `Failed to get merchant transactions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');

      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to get M-Pesa access token', error);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  private async registerMerchant(dto: CreateMerchantAccountDto, accessToken: string): Promise<any> {
    // This is a simplified implementation
    // In a real scenario, you would integrate with M-Pesa's merchant registration API
    const merchantId = `MERCHANT_${Date.now()}_${dto.companyId}`;
    
    return {
      merchantId,
      requirements: {
        businessRegistration: 'pending',
        bankAccount: 'pending',
        kycDocuments: 'pending',
      },
    };
  }

  private async generateBusinessShortCode(merchantId: string, accessToken: string): Promise<string> {
    // This is a simplified implementation
    // In a real scenario, you would integrate with M-Pesa's shortcode generation API
    return `BUSINESS_${Date.now().toString().slice(-6)}`;
  }

  private async transferToAccount(
    accountId: string,
    amount: number,
    description: string,
    accessToken: string,
  ): Promise<any> {
    // This is a simplified implementation
    // In a real scenario, you would integrate with M-Pesa's transfer API
    const transferId = `TRANSFER_${Date.now()}_${accountId}`;
    
    return {
      transferId,
      accountId,
      amount,
      description,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generatePassword(timestamp: string): string {
    const businessShortCode = this.config.businessShortCode;
    const passkey = this.config.passkey;
    const passwordString = `${businessShortCode}${passkey}${timestamp}`;
    
    return Buffer.from(passwordString).toString('base64');
  }

  async handleWebhook(payload: any): Promise<any> {
    try {
      this.logger.log(`M-Pesa webhook received: ${payload.ResultCode}`);

      switch (payload.ResultCode) {
        case '0':
          return this.handleSuccessfulPayment(payload);
        case '1':
          return this.handleInsufficientFunds(payload);
        case '2':
          return this.handleLessThanMinimum(payload);
        case '3':
          return this.handleMoreThanMaximum(payload);
        case '4':
          return this.handleWouldExceedDailyLimit(payload);
        case '5':
          return this.handleWouldExceedMinimumLimit(payload);
        case '6':
          return this.handleUnresolvedPrimaryParty(payload);
        case '7':
          return this.handleUnresolvedReceiverParty(payload);
        case '8':
          return this.handleWouldExceedMaxBalance(payload);
        case '11':
          return this.handleDebitAccountInvalid(payload);
        case '12':
          return this.handleCreditAccountInvalid(payload);
        case '13':
          return this.handleUnresolvedDebitAccount(payload);
        case '14':
          return this.handleUnresolvedCreditAccount(payload);
        case '15':
          return this.handleDuplicateDetected(payload);
        case '16':
          return this.handleInternalFailure(payload);
        case '17':
          return this.handleUnresolvedInitiator(payload);
        case '18':
          return this.handleTrafficBlockingCondition(payload);
        default:
          this.logger.log(`Unhandled M-Pesa result code: ${payload.ResultCode}`);
          return null;
      }
    } catch (error) {
      this.logger.error('M-Pesa webhook processing failed', error);
      throw new HttpException('M-Pesa webhook processing failed', HttpStatus.BAD_REQUEST);
    }
  }

  private async handleSuccessfulPayment(payload: any): Promise<void> {
    this.logger.log(`Payment successful: ${payload.CheckoutRequestID} - Amount: ${payload.Amount}`);
    // Process successful payment and trigger split
  }

  private async handleInsufficientFunds(payload: any): Promise<void> {
    this.logger.log(`Insufficient funds: ${payload.CheckoutRequestID}`);
    // Handle insufficient funds
  }

  private async handleLessThanMinimum(payload: any): Promise<void> {
    this.logger.log(`Amount less than minimum: ${payload.CheckoutRequestID}`);
    // Handle amount below minimum
  }

  private async handleMoreThanMaximum(payload: any): Promise<void> {
    this.logger.log(`Amount more than maximum: ${payload.CheckoutRequestID}`);
    // Handle amount above maximum
  }

  private async handleWouldExceedDailyLimit(payload: any): Promise<void> {
    this.logger.log(`Would exceed daily limit: ${payload.CheckoutRequestID}`);
    // Handle daily limit exceeded
  }

  private async handleWouldExceedMinimumLimit(payload: any): Promise<void> {
    this.logger.log(`Would exceed minimum limit: ${payload.CheckoutRequestID}`);
    // Handle minimum limit exceeded
  }

  private async handleUnresolvedPrimaryParty(payload: any): Promise<void> {
    this.logger.log(`Unresolved primary party: ${payload.CheckoutRequestID}`);
    // Handle unresolved primary party
  }

  private async handleUnresolvedReceiverParty(payload: any): Promise<void> {
    this.logger.log(`Unresolved receiver party: ${payload.CheckoutRequestID}`);
    // Handle unresolved receiver party
  }

  private async handleWouldExceedMaxBalance(payload: any): Promise<void> {
    this.logger.log(`Would exceed max balance: ${payload.CheckoutRequestID}`);
    // Handle max balance exceeded
  }

  private async handleDebitAccountInvalid(payload: any): Promise<void> {
    this.logger.log(`Debit account invalid: ${payload.CheckoutRequestID}`);
    // Handle invalid debit account
  }

  private async handleCreditAccountInvalid(payload: any): Promise<void> {
    this.logger.log(`Credit account invalid: ${payload.CheckoutRequestID}`);
    // Handle invalid credit account
  }

  private async handleUnresolvedDebitAccount(payload: any): Promise<void> {
    this.logger.log(`Unresolved debit account: ${payload.CheckoutRequestID}`);
    // Handle unresolved debit account
  }

  private async handleUnresolvedCreditAccount(payload: any): Promise<void> {
    this.logger.log(`Unresolved credit account: ${payload.CheckoutRequestID}`);
    // Handle unresolved credit account
  }

  private async handleDuplicateDetected(payload: any): Promise<void> {
    this.logger.log(`Duplicate detected: ${payload.CheckoutRequestID}`);
    // Handle duplicate transaction
  }

  private async handleInternalFailure(payload: any): Promise<void> {
    this.logger.log(`Internal failure: ${payload.CheckoutRequestID}`);
    // Handle internal failure
  }

  private async handleUnresolvedInitiator(payload: any): Promise<void> {
    this.logger.log(`Unresolved initiator: ${payload.CheckoutRequestID}`);
    // Handle unresolved initiator
  }

  private async handleTrafficBlockingCondition(payload: any): Promise<void> {
    this.logger.log(`Traffic blocking condition: ${payload.CheckoutRequestID}`);
    // Handle traffic blocking
  }
}
