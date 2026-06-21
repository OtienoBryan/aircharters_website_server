import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentConfirmationRequest,
  PaymentConfirmationResponse,
  PaymentMethod
} from '../interfaces/payment-provider.interface';
import { ExchangeRateService } from '../services/exchange-rate.service';
import { Currency, TransactionLedger, TransactionType, TransactionStatus } from '../../../common/entities/transaction-ledger.entity';
import { PaymentProvider as PaymentProviderEnum } from '../../../common/entities/company-payment-account.entity';
import { Booking, BookingStatus, PaymentStatus } from '../../../common/entities/booking.entity';
import * as Paystack from 'paystack';

@Injectable()
export class PaystackProvider implements PaymentProvider {
  private readonly logger = new Logger(PaystackProvider.name);
  private paystack: any;

  // PaymentProvider interface properties
  name = 'Paystack';
  supportedCurrencies = ['NGN', 'GHS', 'ZAR', 'KES', 'USD'];
  supportedPaymentMethods = ['card', 'bank_transfer', 'ussd', 'qr', 'mobile_money'];

  constructor(
    private exchangeRateService: ExchangeRateService,
    @InjectRepository(TransactionLedger)
    private transactionLedgerRepository: Repository<TransactionLedger>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {
    // Initialize Paystack with secret key
    this.paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
  }

  /**
   * Create a payment intent with Paystack
   * Creates a transaction with subaccount splitting
   */
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      this.logger.log(`Initializing Paystack payment for booking: ${request.bookingId}`);

      // Get vendor's Paystack subaccount
      const subaccount = await this.getVendorSubaccount(request.metadata?.companyId);
      if (!subaccount) {
        throw new Error(`No Paystack subaccount found for company: ${request.metadata?.companyId}`);
      }

      // Calculate split amounts (assuming 5% platform fee for now)
      const platformFeeRate = 0.05; // 5% platform fee
      const splitAmounts = this.calculateSplitAmounts(
        request.amount,
        platformFeeRate
      );

      // Handle currency conversion for Paystack
      let paystackAmount = request.amount;
      let paystackCurrency = request.currency || 'KES';
      
      // If the request is in USD but Paystack needs KES, convert it
      if (request.currency === 'USD') {
        try {
          const conversion = await this.exchangeRateService.convertCurrency({
            amount: request.amount,
            from: Currency.USD,
            to: Currency.KES
          });
          paystackAmount = conversion.convertedAmount;
          paystackCurrency = 'KES';
          
          this.logger.log(`Converted ${request.amount} USD to ${paystackAmount} KES (rate: ${conversion.rate})`);
        } catch (error) {
          this.logger.error(`Currency conversion failed: ${error.message}`);
          // Fallback to hardcoded rate
          paystackAmount = request.amount * 129; // 1 USD = 129 KES (fallback)
          paystackCurrency = 'KES';
          this.logger.warn(`Using fallback conversion: ${request.amount} USD = ${paystackAmount} KES`);
        }
      }

      // Create Paystack transaction
      const transactionData = {
        amount: Math.round(paystackAmount * 100), // Convert to kobo (smallest currency unit)
        email: request.metadata?.customerEmail || 'customer@example.com',
        currency: paystackCurrency,
        reference: this.generateReference(request.bookingId),
        callback_url: process.env.PAYSTACK_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:5000'}/api/payments/paystack/verify`,
        metadata: {
          bookingId: request.bookingId,
          companyId: request.metadata?.companyId,
          userId: request.userId,
          platformFee: splitAmounts.platformFee,
          companyAmount: splitAmounts.companyAmount,
          originalCurrency: request.currency,
          originalAmount: request.amount,
          convertedAmount: paystackAmount,
          convertedCurrency: paystackCurrency
        },
        // Subaccount splitting - Fixed: Use subaccount parameter instead of split
        subaccount: subaccount.paystackSubaccountId
      };

      // Initialize transaction with Paystack
      const response = await this.paystack.transaction.initialize(transactionData);

      if (!response.status) {
        throw new Error(`Paystack initialization failed: ${response.message}`);
      }

      this.logger.log(`Paystack payment initialized successfully: ${response.data.reference}`);

      // Log transaction to ledger
      this.logger.log(`Attempting to log transaction to ledger: ${response.data.reference}`);
      // Extract user ID properly
      const userId = this.extractUserIdFromString(request.userId);
      this.logger.log(`Logging transaction for user ID: ${userId} (from: ${request.userId})`);
      
      // Don't await - let it run in background to prevent checkout timeout
      this.logTransactionToLedger({
        transactionId: response.data.reference,
        companyId: request.metadata?.companyId,
        userId: userId,
        bookingId: request.bookingId,
        amount: request.amount,
        currency: request.currency as Currency,
        paystackAmount: paystackAmount,
        paystackCurrency: paystackCurrency,
        exchangeRate: request.currency === 'USD' ? (paystackAmount / request.amount) : 1.0,
        status: TransactionStatus.PROCESSING,
        description: request.description,
        metadata: request.metadata,
      }).catch(error => {
        // Log error but don't throw to avoid breaking payment flow
        this.logger.error(`Background transaction logging failed: ${error.message}`);
      });

      return {
        id: response.data.reference,
        clientSecret: response.data.access_code,
        status: 'requires_action',
        amount: request.amount, // Return original amount in original currency
        currency: request.currency, // Return original currency
        paymentMethod: 'paystack',
        requiresAction: true,
        nextAction: {
          type: 'redirect_to_url',
          redirect_to_url: {
            url: response.data.authorization_url
          }
        },
        metadata: {
          paystackAmount: paystackAmount,
          paystackCurrency: paystackCurrency,
          exchangeRate: request.currency === 'USD' ? (paystackAmount / request.amount) : 1.0
        }
      };

    } catch (error) {
      this.logger.error(`Paystack payment initialization failed: ${error.message}`, error.stack);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  /**
   * Confirm a payment with Paystack
   * Checks transaction status and updates booking
   */
  async confirmPayment(request: PaymentConfirmationRequest): Promise<PaymentConfirmationResponse> {
    try {
      this.logger.log(`Confirming Paystack payment: ${request.paymentIntentId}`);

      // Verify transaction with Paystack
      const response = await this.paystack.transaction.verify(request.paymentIntentId);

      if (!response.status) {
        throw new Error(`Paystack verification failed: ${response.message}`);
      }

      const transaction = response.data;

      // Check if payment was successful
      const isSuccessful = transaction.status === 'success' && transaction.amount > 0;

      this.logger.log(`Paystack payment verification result: ${isSuccessful ? 'SUCCESS' : 'FAILED'}`);

      // Update transaction ledger
      await this.updateTransactionLedger(transaction.reference, {
        status: isSuccessful ? TransactionStatus.COMPLETED : TransactionStatus.FAILED,
        providerTransactionId: transaction.reference,
        providerMetadata: transaction,
        processedAt: new Date(),
        errorMessage: !isSuccessful ? (transaction.message || transaction.gateway_response || 'Payment failed') : null,
      });

      // Update booking status if payment was successful
      if (isSuccessful && transaction.metadata?.bookingId) {
        await this.updateBookingStatus(transaction.metadata.bookingId, true);
      } else if (!isSuccessful && transaction.metadata?.bookingId) {
        await this.updateBookingStatus(transaction.metadata.bookingId, false);
      }

      return {
        id: transaction.reference,
        status: isSuccessful ? 'succeeded' : 'failed',
        amount: transaction.amount / 100, // Convert from kobo
        currency: transaction.currency,
        transactionId: transaction.reference,
        paymentMethod: 'paystack',
        metadata: {
          paystackReference: transaction.reference,
          gatewayResponse: transaction,
          customer: transaction.customer,
          authorization: transaction.authorization
        }
      };

    } catch (error) {
      this.logger.error(`Paystack payment verification failed: ${error.message}`, error.stack);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Get payment status from Paystack
   */
  async getPaymentStatus(paymentIntentId: string): Promise<PaymentConfirmationResponse> {
    try {
      this.logger.log(`Getting Paystack payment status: ${paymentIntentId}`);

      const response = await this.paystack.transaction.verify(paymentIntentId);

      if (!response.status) {
        throw new Error(`Paystack status check failed: ${response.message}`);
      }

      const transaction = response.data;
      
      // Log transaction details for debugging
      this.logger.log(`Paystack transaction details: ${JSON.stringify({
        reference: transaction.reference,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        gateway_response: transaction.gateway_response,
        message: transaction.message
      })}`);

      // Check if transaction is successful
      const isSuccessful = transaction.status === 'success' && transaction.amount > 0;
      
      // If not successful, log the reason
      if (!isSuccessful) {
        this.logger.warn(`Paystack payment failed: Status=${transaction.status}, Amount=${transaction.amount}, Message=${transaction.message || transaction.gateway_response || 'No message'}`);
      }

      // Only update transaction ledger if status has changed (prevent unnecessary DB writes)
      const existingLedger = await this.getTransactionLedger(transaction.reference);
      const currentStatus = isSuccessful ? TransactionStatus.COMPLETED : TransactionStatus.FAILED;
      
      if (!existingLedger || existingLedger.status !== currentStatus) {
        await this.updateTransactionLedger(transaction.reference, {
          status: currentStatus,
          providerTransactionId: transaction.reference,
          providerMetadata: transaction,
          processedAt: new Date(),
          errorMessage: !isSuccessful ? (transaction.message || transaction.gateway_response || 'Payment failed') : null,
        });

        // Update booking status only if transaction status changed
        if (transaction.metadata?.bookingId) {
          await this.updateBookingStatus(transaction.metadata.bookingId, isSuccessful);
        }
      }

      return {
        id: transaction.reference,
        status: isSuccessful ? 'succeeded' : 'failed',
        amount: transaction.amount / 100,
        currency: transaction.currency,
        transactionId: transaction.reference,
        paymentMethod: 'paystack',
        metadata: {
          paystackReference: transaction.reference,
          gatewayResponse: transaction,
          failureReason: !isSuccessful ? transaction.message || 'Payment failed' : null
        }
      };

    } catch (error) {
      this.logger.error(`Paystack status check failed: ${error.message}`, error.stack);
      throw new Error(`Payment status check failed: ${error.message}`);
    }
  }

  /**
   * Create a refund (if supported by Paystack)
   */
  async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
    try {
      this.logger.log(`Creating Paystack refund: ${paymentIntentId}`);

      const refundData = {
        transaction: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to kobo
        reason: reason || 'requested_by_customer'
      };

      const response = await this.paystack.refund.create(refundData);

      if (!response.status) {
        throw new Error(`Paystack refund failed: ${response.message}`);
      }

      return {
        id: response.data.id,
        status: response.data.status,
        amount: response.data.amount / 100,
        currency: response.data.currency,
        reason: response.data.reason
      };

    } catch (error) {
      this.logger.error(`Paystack refund failed: ${error.message}`, error.stack);
      throw new Error(`Refund creation failed: ${error.message}`);
    }
  }

  /**
   * Handle Paystack webhook events
   * Processes payment status updates
   */
  async handleWebhook(event: any, signature?: string): Promise<boolean> {
    try {
      this.logger.log(`Processing Paystack webhook: ${event.event}`);

      // Verify webhook signature
      if (!this.verifyWebhookSignature(event, signature)) {
        this.logger.error('Invalid Paystack webhook signature');
        return false;
      }

      switch (event.event) {
        case 'charge.success':
          await this.handlePaymentSuccess(event.data);
          break;
        case 'charge.failed':
          await this.handlePaymentFailed(event.data);
          break;
        case 'transfer.success':
          await this.handleTransferSuccess(event.data);
          break;
        case 'transfer.failed':
          await this.handleTransferFailed(event.data);
          break;
        case 'subscription.create':
        case 'subscription.disable':
        case 'subscription.enable':
          this.logger.log(`Subscription webhook event: ${event.event} - not implemented yet`);
          break;
        default:
          this.logger.log(`Unhandled Paystack webhook event: ${event.event}`);
      }

      return true;

    } catch (error) {
      this.logger.error(`Paystack webhook processing failed: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Create a Paystack subaccount for a vendor
   */
  async createVendorSubaccount(companyId: number, companyData: any): Promise<any> {
    try {
      this.logger.log(`Creating Paystack subaccount for company: ${companyId}`);

      const subaccountData = {
        business_name: companyData.companyName,
        settlement_bank: companyData.bankCode || '044', // Default to Access Bank
        account_number: companyData.accountNumber,
        percentage_charge: companyData.commissionRate || 0,
        description: `Subaccount for ${companyData.companyName}`,
        primary_contact_email: companyData.email,
        primary_contact_name: `${companyData.contactPersonFirstName} ${companyData.contactPersonLastName}`,
        primary_contact_phone: companyData.mobileNumber,
        metadata: {
          companyId: companyId,
          companyName: companyData.companyName
        }
      };

      const response = await this.paystack.subaccount.create(subaccountData);

      if (!response.status) {
        throw new Error(`Paystack subaccount creation failed: ${response.message}`);
      }

      this.logger.log(`Paystack subaccount created successfully: ${response.data.subaccount_code}`);

      return {
        subaccountId: response.data.id,
        subaccountCode: response.data.subaccount_code,
        splitCode: response.data.split_code,
        status: response.data.active ? 'active' : 'pending'
      };

    } catch (error) {
      this.logger.error(`Paystack subaccount creation failed: ${error.message}`, error.stack);
      throw new Error(`Subaccount creation failed: ${error.message}`);
    }
  }

  /**
   * Get vendor's Paystack subaccount information
   */
  private async getVendorSubaccount(companyId: number): Promise<any> {
    // MINIMAL APPROACH: Query database for Paystack subaccount
    // Uses existing fields + new paystackSubaccountId field
    // TODO: Implement actual database query using TypeORM
    
    // Mock implementation - replace with actual database query
    // SELECT paystackSubaccountId, accountId, metadata FROM company_payment_accounts 
    // WHERE companyId = ? AND paymentProvider = 'paystack' AND accountStatus = 'active'
    
    return {
      paystackSubaccountId: 'ACCT_4evq96sxvwuf7va', // From paystackSubaccountId field
      accountId: 'ACCT_4evq96sxvwuf7va', // From existing accountId field
      percentageCharge: 5.0, // From metadata JSON
      settlementBank: 'Absa Bank Kenya Plc', // From metadata JSON
      settlementAccountNumber: '2051951312', // From metadata JSON
      businessName: 'SPAir Services', // From businessProfile JSON
      status: 'active'
    };
  }

  /**
   * Calculate split amounts for platform and vendor
   */
  private calculateSplitAmounts(totalAmount: number, commissionRate: number): any {
    // commissionRate is already a decimal (0.05 for 5%)
    const platformFee = totalAmount * commissionRate;
    const companyAmount = totalAmount - platformFee;
    const companyPercentage = (companyAmount / totalAmount) * 100;

    return {
      totalAmount,
      platformFee,
      companyAmount,
      companyPercentage,
      commissionRate
    };
  }

  /**
   * Generate unique transaction reference
   */
  private generateReference(bookingId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `PAYSTACK_${bookingId}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Extract numeric user ID from user string
   * Handles formats like "user_1752093294468_5lug3jt2p" or "1"
   */
  private extractUserIdFromString(userIdString: string): number {
    // If it's already a number, return it
    const numericId = parseInt(userIdString);
    if (!isNaN(numericId)) {
      return numericId;
    }

    // Extract from format like "user_1752093294468_5lug3jt2p"
    const match = userIdString.match(/user_(\d+)_/);
    if (match && match[1]) {
      return parseInt(match[1]);
    }

    // Fallback: use hash of the string to create a consistent numeric ID
    let hash = 0;
    for (let i = 0; i < userIdString.length; i++) {
      const char = userIdString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Verify Paystack webhook signature
   */
  private verifyWebhookSignature(event: any, signature?: string): boolean {
    try {
      // In development, skip signature verification for testing
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Skipping webhook signature verification in development mode');
        return true;
      }

      // In production, verify signature
      const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
      if (!webhookSecret) {
        this.logger.error('PAYSTACK_WEBHOOK_SECRET not configured');
        return false;
      }

      if (!signature) {
        this.logger.error('No webhook signature provided');
        return false;
      }

      // Paystack uses HMAC SHA512 for webhook signatures
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha512', webhookSecret)
        .update(JSON.stringify(event))
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        this.logger.error('Invalid webhook signature');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(data: any): Promise<void> {
    this.logger.log(`Payment successful: ${data.reference}`);
    // Update booking status, send notifications, etc.
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    this.logger.log(`Payment failed: ${data.reference}`);
    // Update booking status, send notifications, etc.
  }

  /**
   * Handle successful transfer to vendor
   */
  private async handleTransferSuccess(data: any): Promise<void> {
    this.logger.log(`Transfer successful: ${data.reference}`);
    // Update vendor payout status
  }

  /**
   * Handle failed transfer to vendor
   */
  private async handleTransferFailed(data: any): Promise<void> {
    this.logger.log(`Transfer failed: ${data.reference}`);
    // Handle transfer failure, retry logic, etc.
  }

  /**
   * Log transaction to ledger with retry logic and timeout handling
   */
  private async logTransactionToLedger(data: {
    transactionId: string;
    companyId?: number;
    userId: number;
    bookingId: string;
    amount: number;
    currency: Currency;
    paystackAmount: number;
    paystackCurrency: string;
    exchangeRate: number;
    status: TransactionStatus;
    description: string;
    metadata?: any;
  }): Promise<void> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if this is a test booking or if the bookingId doesn't exist in the database
      const isTestBooking = data.bookingId.startsWith('TEST_') || 
                           data.bookingId.startsWith('TEMP_') || 
                           data.bookingId.startsWith('1757959') ||
                           data.bookingId.startsWith('BK-') ||
                           data.bookingId.startsWith('AC');
      
      const ledgerEntry = this.transactionLedgerRepository.create({
        transactionId: data.transactionId,
        companyId: isTestBooking ? null : data.companyId, // Handle test bookings
        userId: this.extractUserIdFromString(data.userId.toString()),
        bookingId: isTestBooking ? null : data.bookingId, // Handle test bookings
        transactionType: TransactionType.PAYMENT_RECEIVED,
        paymentProvider: PaymentProviderEnum.PAYSTACK,
        amount: data.amount,
        currency: data.currency,
        exchangeRate: data.exchangeRate,
        baseAmount: data.amount * data.exchangeRate,
        netAmount: data.amount,
        status: data.status,
        description: data.description,
        metadata: {
          ...data.metadata,
          paystackAmount: data.paystackAmount,
          paystackCurrency: data.paystackCurrency,
          originalCurrency: data.currency,
          convertedCurrency: data.paystackCurrency,
          isTestTransaction: isTestBooking,
        },
        providerMetadata: {
          paystackReference: data.transactionId,
          paystackAmount: data.paystackAmount,
          paystackCurrency: data.paystackCurrency,
        },
      });

        // Use insert for better performance (bypasses validation and hooks)
        await this.transactionLedgerRepository.insert(ledgerEntry);
        
      this.logger.log(`Transaction logged to ledger: ${data.transactionId}`);
        return; // Success, exit retry loop
    } catch (error) {
        lastError = error;
        
        // Check if it's a lock timeout error
        if (error.message && error.message.includes('Lock wait timeout exceeded')) {
          if (attempt < maxRetries) {
            // Exponential backoff: wait 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            this.logger.warn(`Lock timeout on attempt ${attempt}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // For non-lock errors or final attempt, log and break
        this.logger.error(`Failed to log transaction to ledger (attempt ${attempt}): ${error.message}`, error.stack);
        break;
      }
    }

    // If all retries failed, log the final error but don't throw to avoid breaking payment flow
    this.logger.error(`Failed to log transaction to ledger after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Update booking status based on payment result
   */
  private async updateBookingStatus(bookingId: string, paymentSuccessful: boolean): Promise<void> {
    try {
      // Skip test bookings
      if (bookingId.startsWith('TEST_') || bookingId.startsWith('1757959')) {
        this.logger.log(`Skipping booking status update for test booking: ${bookingId}`);
        return;
      }

      const booking = await this.bookingRepository.findOne({
        where: { id: parseInt(bookingId) }
      });

      if (!booking) {
        this.logger.warn(`Booking not found for ID: ${bookingId}`);
        return;
      }

      // Update payment status
      booking.paymentStatus = paymentSuccessful ? PaymentStatus.PAID : PaymentStatus.FAILED;

      // Update booking status if payment was successful
      if (paymentSuccessful && booking.bookingStatus === BookingStatus.PENDING) {
        booking.bookingStatus = BookingStatus.CONFIRMED;
        this.logger.log(`Booking ${bookingId} confirmed after successful payment`);
      }

      await this.bookingRepository.save(booking);
      this.logger.log(`Booking ${bookingId} status updated - Payment: ${booking.paymentStatus}, Booking: ${booking.bookingStatus}`);
    } catch (error) {
      this.logger.error(`Failed to update booking status for ${bookingId}: ${error.message}`, error.stack);
      // Don't throw error to avoid breaking payment flow
    }
  }

  /**
   * Update transaction ledger
   */
  private async updateTransactionLedger(transactionId: string, updates: {
    status?: TransactionStatus;
    providerTransactionId?: string;
    providerMetadata?: any;
    processedAt?: Date;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const ledgerEntry = await this.transactionLedgerRepository.findOne({
        where: { transactionId }
      });

      if (ledgerEntry) {
        Object.assign(ledgerEntry, updates);
        await this.transactionLedgerRepository.save(ledgerEntry);
        this.logger.log(`Transaction ledger updated: ${transactionId} - Status: ${updates.status}`);
      } else {
        // If transaction doesn't exist in ledger (e.g., abandoned transaction), create it
        this.logger.log(`Transaction not found in ledger, creating entry for: ${transactionId}`);
        
        // Extract basic info from provider metadata
        const providerData = updates.providerMetadata || {};
        const amount = providerData.amount ? providerData.amount / 100 : 0; // Convert from kobo
        const currency = providerData.currency || 'KES';
        
        // Check if this is a test transaction
        const isTestTransaction = transactionId.startsWith('PAYSTACK_TEST_') || 
                                 transactionId.includes('1757959') ||
                                 (providerData.metadata?.bookingId && providerData.metadata.bookingId.startsWith('1757959'));
        
        const newLedgerEntry = this.transactionLedgerRepository.create({
          transactionId: transactionId,
          companyId: isTestTransaction ? null : (providerData.metadata?.companyId || null),
          userId: this.extractUserIdFromString(providerData.metadata?.userId || '1'),
          bookingId: isTestTransaction ? null : (providerData.metadata?.bookingId || null),
          transactionType: TransactionType.PAYMENT_RECEIVED,
          paymentProvider: PaymentProviderEnum.PAYSTACK,
          amount: amount,
          currency: currency as Currency,
          exchangeRate: 1.0, // Default for KES
          baseAmount: amount,
          netAmount: amount,
          status: updates.status || TransactionStatus.FAILED,
          description: `Payment ${updates.status === TransactionStatus.COMPLETED ? 'completed' : 'failed'}`,
          metadata: providerData.metadata || {},
          providerMetadata: providerData,
          errorMessage: updates.errorMessage,
          processedAt: updates.processedAt,
        });

        await this.transactionLedgerRepository.save(newLedgerEntry);
        this.logger.log(`Transaction ledger entry created: ${transactionId} - Status: ${updates.status}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update transaction ledger: ${error.message}`, error.stack);
      // Don't throw error to avoid breaking payment flow
    }
  }

  /**
   * Get transaction ledger entry
   */
  private async getTransactionLedger(transactionId: string): Promise<any> {
    try {
      return await this.transactionLedgerRepository.findOne({
        where: { transactionId }
      });
    } catch (error) {
      this.logger.error(`Failed to get transaction ledger: ${error.message}`, error.stack);
      return null;
    }
  }
}
