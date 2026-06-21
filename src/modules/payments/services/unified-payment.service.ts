import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TransactionLedger, TransactionType, TransactionStatus, Currency } from '../../../common/entities/transaction-ledger.entity';
import { PaymentProvider, AccountStatus } from '../../../common/entities/company-payment-account.entity';
import { CompanyPaymentAccount } from '../../../common/entities/company-payment-account.entity';
import { StripeConnectProvider } from '../providers/stripe-connect.provider';
import { MpesaMerchantProvider } from '../providers/mpesa-merchant.provider';
import { DynamicCommissionService } from '../../commission/services/dynamic-commission.service';
import { BookingType } from '../../../common/entities/platform-commission.entity';
import { ExchangeRateService } from './exchange-rate.service';

export interface UnifiedPaymentRequest {
  userId: number;
  companyId: number;
  bookingId: string;
  amount: number;
  currency: Currency;
  paymentMethod: 'card' | 'mpesa' | 'bank_transfer';
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface UnifiedPaymentResponse {
  transactionId: string;
  provider: PaymentProvider;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  platformFee: number;
  companyAmount: number;
  requiresAction: boolean;
  nextAction?: any;
  providerData?: any;
}

export interface PaymentProviderSelection {
  provider: PaymentProvider;
  reason: string;
  priority: number;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  totalPayouts: number;
  currency: Currency;
  period: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class UnifiedPaymentService {
  private readonly logger = new Logger(UnifiedPaymentService.name);

  constructor(
    @InjectRepository(TransactionLedger)
    private transactionLedgerRepository: Repository<TransactionLedger>,
    @InjectRepository(CompanyPaymentAccount)
    private companyPaymentAccountRepository: Repository<CompanyPaymentAccount>,
    private stripeConnectProvider: StripeConnectProvider,
    private mpesaMerchantProvider: MpesaMerchantProvider,
    private dynamicCommissionService: DynamicCommissionService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  async processPayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    this.logger.log(`Processing unified payment: ${request.amount} ${request.currency} for booking ${request.bookingId}`);

    // 1. Select payment provider
    const providerSelection = await this.selectPaymentProvider(request);
    
    // 2. Calculate commission
    const commission = await this.dynamicCommissionService.calculateCommission({
      companyId: request.companyId,
      bookingType: BookingType.CHARTER_DEAL, // or DIRECT_CHARTER based on booking type
      totalAmount: request.amount,
      currency: request.currency,
    });

    // 3. Get company payment account
    const companyAccount = await this.getCompanyPaymentAccount(request.companyId, providerSelection.provider);
    if (!companyAccount) {
      throw new BadRequestException(`No active ${providerSelection.provider} account found for company ${request.companyId}`);
    }

    // 4. Create transaction ledger entry
    const transactionId = this.generateTransactionId();
    const ledgerEntry = await this.createLedgerEntry({
      transactionId,
      parentTransactionId: null,
      companyId: request.companyId,
      userId: request.userId,
      bookingId: request.bookingId,
      transactionType: TransactionType.PAYMENT_RECEIVED,
      paymentProvider: providerSelection.provider,
      amount: request.amount,
      currency: request.currency,
      baseAmount: request.amount * (request.currency === Currency.USD ? 1 : await this.getExchangeRate(request.currency)),
      netAmount: request.amount,
      description: request.description,
      metadata: {
        ...request.metadata,
        providerSelection: providerSelection,
        commissionCalculation: commission,
      },
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });

    try {
      // 5. Process payment with selected provider
      let paymentResult: any;
      
      if (providerSelection.provider === PaymentProvider.STRIPE) {
        paymentResult = await this.processStripePayment(request, companyAccount, commission);
      } else if (providerSelection.provider === PaymentProvider.MPESA) {
        paymentResult = await this.processMpesaPayment(request, companyAccount, commission);
      } else if (providerSelection.provider === PaymentProvider.PAYSTACK) {
        paymentResult = await this.processPaystackPayment(request, companyAccount, commission);
      } else {
        throw new BadRequestException(`Unsupported payment provider: ${providerSelection.provider}`);
      }

      // 6. Update ledger entry with provider data
      await this.updateLedgerEntry(transactionId, {
        status: paymentResult.requiresAction ? TransactionStatus.PROCESSING : TransactionStatus.COMPLETED,
        providerTransactionId: paymentResult.providerTransactionId,
        providerMetadata: paymentResult.providerData,
        processedAt: new Date(),
      });

      // 7. Create platform fee and company payout entries
      await this.createSplitLedgerEntries(transactionId, commission, providerSelection.provider);

      return {
        transactionId,
        provider: providerSelection.provider,
        status: paymentResult.requiresAction ? TransactionStatus.PROCESSING : TransactionStatus.COMPLETED,
        amount: request.amount,
        currency: request.currency,
        platformFee: commission.platformCommission,
        companyAmount: commission.companyAmount,
        requiresAction: paymentResult.requiresAction,
        nextAction: paymentResult.nextAction,
        providerData: paymentResult.providerData,
      };
    } catch (error) {
      // Update ledger entry with error
      await this.updateLedgerEntry(transactionId, {
        status: TransactionStatus.FAILED,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  async confirmPayment(transactionId: string, paymentMethodId?: string): Promise<UnifiedPaymentResponse> {
    const ledgerEntry = await this.getTransactionById(transactionId);
    if (!ledgerEntry) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (ledgerEntry.status !== TransactionStatus.PROCESSING) {
      throw new BadRequestException(`Transaction ${transactionId} is not in processing status`);
    }

    try {
      let confirmationResult: any;

      if (ledgerEntry.paymentProvider === PaymentProvider.STRIPE) {
        confirmationResult = await this.stripeConnectProvider.confirmSplitPayment(
          ledgerEntry.providerTransactionId,
          paymentMethodId,
        );
      } else {
        throw new BadRequestException(`Payment confirmation not supported for ${ledgerEntry.paymentProvider}`);
      }

      // Update ledger entry
      await this.updateLedgerEntry(transactionId, {
        status: TransactionStatus.COMPLETED,
        settledAt: new Date(),
        providerMetadata: {
          ...ledgerEntry.providerMetadata,
          confirmation: confirmationResult,
        },
      });

      return {
        transactionId,
        provider: ledgerEntry.paymentProvider,
        status: TransactionStatus.COMPLETED,
        amount: ledgerEntry.amount,
        currency: ledgerEntry.currency,
        platformFee: ledgerEntry.metadata?.commissionCalculation?.platformCommission || 0,
        companyAmount: ledgerEntry.metadata?.commissionCalculation?.companyAmount || 0,
        requiresAction: false,
      };
    } catch (error) {
      await this.updateLedgerEntry(transactionId, {
        status: TransactionStatus.FAILED,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  async getTransactionById(transactionId: string): Promise<TransactionLedger | null> {
    return await this.transactionLedgerRepository.findOne({
      where: { transactionId },
      relations: ['company'],
    });
  }

  async getTransactionsByCompany(
    companyId: number,
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: TransactionStatus;
      type?: TransactionType;
      provider?: PaymentProvider;
    } = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: TransactionLedger[]; total: number }> {
    const query = this.transactionLedgerRepository.createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId })
      .leftJoinAndSelect('transaction.company', 'company');

    if (filters.startDate && filters.endDate) {
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.status) {
      query.andWhere('transaction.status = :status', { status: filters.status });
    }

    if (filters.type) {
      query.andWhere('transaction.transactionType = :type', { type: filters.type });
    }

    if (filters.provider) {
      query.andWhere('transaction.paymentProvider = :provider', { provider: filters.provider });
    }

    const total = await query.getCount();
    const transactions = await query
      .orderBy('transaction.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    return { transactions, total };
  }

  async getTransactionSummary(
    companyId: number,
    startDate: Date,
    endDate: Date,
    currency: Currency = Currency.USD,
  ): Promise<TransactionSummary> {
    const query = this.transactionLedgerRepository.createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED });

    const transactions = await query.getMany();

    const summary: TransactionSummary = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      totalFees: 0,
      totalPayouts: 0,
      currency,
      period: { start: startDate, end: endDate },
    };

    for (const transaction of transactions) {
      if (transaction.transactionType === TransactionType.PAYMENT_RECEIVED) {
        summary.totalAmount += transaction.baseAmount;
      } else if (transaction.transactionType === TransactionType.PLATFORM_FEE) {
        summary.totalFees += transaction.baseAmount;
      } else if (transaction.transactionType === TransactionType.COMPANY_PAYOUT) {
        summary.totalPayouts += transaction.baseAmount;
      }
    }

    return summary;
  }

  async getReconciliationReport(
    startDate: Date,
    endDate: Date,
    provider?: PaymentProvider,
  ): Promise<any> {
    const query = this.transactionLedgerRepository.createQueryBuilder('transaction')
      .where('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED });

    if (provider) {
      query.andWhere('transaction.paymentProvider = :provider', { provider });
    }

    const transactions = await query.getMany();

    const report = {
      period: { start: startDate, end: endDate },
      provider: provider || 'all',
      totalTransactions: transactions.length,
      totalAmount: 0,
      totalFees: 0,
      totalPayouts: 0,
      byType: {},
      byProvider: {},
      byStatus: {},
    };

    for (const transaction of transactions) {
      // Aggregate by type
      if (!report.byType[transaction.transactionType]) {
        report.byType[transaction.transactionType] = { count: 0, amount: 0 };
      }
      report.byType[transaction.transactionType].count++;
      report.byType[transaction.transactionType].amount += transaction.baseAmount;

      // Aggregate by provider
      if (!report.byProvider[transaction.paymentProvider]) {
        report.byProvider[transaction.paymentProvider] = { count: 0, amount: 0 };
      }
      report.byProvider[transaction.paymentProvider].count++;
      report.byProvider[transaction.paymentProvider].amount += transaction.baseAmount;

      // Aggregate by status
      if (!report.byStatus[transaction.status]) {
        report.byStatus[transaction.status] = { count: 0, amount: 0 };
      }
      report.byStatus[transaction.status].count++;
      report.byStatus[transaction.status].amount += transaction.baseAmount;

      // Calculate totals
      if (transaction.transactionType === TransactionType.PAYMENT_RECEIVED) {
        report.totalAmount += transaction.baseAmount;
      } else if (transaction.transactionType === TransactionType.PLATFORM_FEE) {
        report.totalFees += transaction.baseAmount;
      } else if (transaction.transactionType === TransactionType.COMPANY_PAYOUT) {
        report.totalPayouts += transaction.baseAmount;
      }
    }

    return report;
  }

  private async selectPaymentProvider(request: UnifiedPaymentRequest): Promise<PaymentProviderSelection> {
    const providers: PaymentProviderSelection[] = [];

    // Default to Paystack for all payments (new default)
    providers.push({
      provider: PaymentProvider.PAYSTACK,
      reason: 'Paystack is the default payment provider',
      priority: 1,
    });

    // Check currency-based selection
    if (request.currency === Currency.KES) {
      providers.push({
        provider: PaymentProvider.MPESA,
        reason: 'Currency is KES, M-Pesa is preferred',
        priority: 2,
      });
    }

    // Check payment method preference
    if (request.paymentMethod === 'mpesa') {
      providers.push({
        provider: PaymentProvider.MPESA,
        reason: 'User selected M-Pesa payment method',
        priority: 2,
      });
    } else if (request.paymentMethod === 'card') {
      providers.push({
        provider: PaymentProvider.PAYSTACK,
        reason: 'User selected card payment method, using Paystack',
        priority: 2,
      });
    }

    // Check company account availability
    const stripeAccount = await this.getCompanyPaymentAccount(request.companyId, PaymentProvider.STRIPE);
    const mpesaAccount = await this.getCompanyPaymentAccount(request.companyId, PaymentProvider.MPESA);
    const paystackAccount = await this.getCompanyPaymentAccount(request.companyId, PaymentProvider.PAYSTACK);

    if (paystackAccount && paystackAccount.accountStatus === 'active') {
      providers.push({
        provider: PaymentProvider.PAYSTACK,
        reason: 'Company has active Paystack account',
        priority: 3,
      });
    }

    if (stripeAccount && stripeAccount.accountStatus === 'active') {
      providers.push({
        provider: PaymentProvider.STRIPE,
        reason: 'Company has active Stripe account',
        priority: 4,
      });
    }

    if (mpesaAccount && mpesaAccount.accountStatus === 'active') {
      providers.push({
        provider: PaymentProvider.MPESA,
        reason: 'Company has active M-Pesa account',
        priority: 4,
      });
    }

    // Default to Paystack for USD/EUR/GBP (updated default)
    if ([Currency.USD, Currency.EUR, Currency.GBP].includes(request.currency)) {
      providers.push({
        provider: PaymentProvider.PAYSTACK,
        reason: 'Default provider for USD/EUR/GBP',
        priority: 5,
      });
    }

    // Sort by priority and return the best match
    providers.sort((a, b) => a.priority - b.priority);
    
    if (providers.length === 0) {
      throw new BadRequestException('No suitable payment provider found');
    }

    return providers[0];
  }

  private async getCompanyPaymentAccount(companyId: number, provider: PaymentProvider): Promise<CompanyPaymentAccount | null> {
    return await this.companyPaymentAccountRepository.findOne({
      where: {
        companyId,
        paymentProvider: provider,
        isActive: true,
        accountStatus: AccountStatus.ACTIVE,
      },
    });
  }

  private async processStripePayment(
    request: UnifiedPaymentRequest,
    companyAccount: CompanyPaymentAccount,
    commission: any,
  ): Promise<any> {
    const stripeRequest = {
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      companyAccountId: companyAccount.accountId,
      platformFeeAmount: Math.round(commission.platformCommission * 100),
      description: request.description,
      metadata: {
        bookingId: request.bookingId,
        userId: request.userId,
        companyId: request.companyId,
      },
    };

    return await this.stripeConnectProvider.createSplitPayment(stripeRequest);
  }

  private async processMpesaPayment(
    request: UnifiedPaymentRequest,
    companyAccount: CompanyPaymentAccount,
    commission: any,
  ): Promise<any> {
    const mpesaRequest = {
      amount: Math.round(request.amount),
      phoneNumber: request.metadata?.phoneNumber || '',
      businessShortCode: companyAccount.metadata?.businessShortCode || '',
      accountReference: request.bookingId,
      transactionDesc: request.description,
      metadata: {
        companyId: request.companyId,
        platformFee: Math.round(commission.platformCommission),
        companyAmount: Math.round(commission.companyAmount),
        bookingId: request.bookingId,
      },
    };

    return await this.mpesaMerchantProvider.createSplitPayment(mpesaRequest);
  }

  private async processPaystackPayment(
    request: UnifiedPaymentRequest,
    companyAccount: CompanyPaymentAccount,
    commission: any,
  ): Promise<any> {
    // This would integrate with the PaystackProvider
    // For now, returning a mock response structure
    return {
      providerTransactionId: `paystack_${Date.now()}`,
      requiresAction: true,
      nextAction: {
        type: 'redirect_to_url',
        redirect_to_url: {
          url: 'https://paystack.com/pay/mock_reference'
        }
      },
      providerData: {
        paystackReference: `paystack_${Date.now()}`,
        subaccount: companyAccount.accountId,
        splitAmounts: {
          platformFee: commission.platformCommission,
          companyAmount: commission.companyAmount
        }
      }
    };
  }

  private async createLedgerEntry(data: Partial<TransactionLedger>): Promise<TransactionLedger> {
    const entry = this.transactionLedgerRepository.create(data);
    return await this.transactionLedgerRepository.save(entry);
  }

  private async updateLedgerEntry(transactionId: string, updates: Partial<TransactionLedger>): Promise<void> {
    await this.transactionLedgerRepository.update({ transactionId }, updates);
  }

  private async createSplitLedgerEntries(
    parentTransactionId: string,
    commission: any,
    provider: PaymentProvider,
  ): Promise<void> {
    // Create platform fee entry
    await this.createLedgerEntry({
      transactionId: `${parentTransactionId}_FEE`,
      parentTransactionId,
      companyId: null, // Platform fee
      transactionType: TransactionType.PLATFORM_FEE,
      paymentProvider: provider,
      amount: commission.platformCommission,
      currency: commission.currency,
      baseAmount: commission.platformCommission,
      netAmount: commission.platformCommission,
      description: `Platform fee for transaction ${parentTransactionId}`,
      status: TransactionStatus.COMPLETED,
      processedAt: new Date(),
    });

    // Create company payout entry
    await this.createLedgerEntry({
      transactionId: `${parentTransactionId}_PAYOUT`,
      parentTransactionId,
      companyId: commission.companyId,
      transactionType: TransactionType.COMPANY_PAYOUT,
      paymentProvider: provider,
      amount: commission.companyAmount,
      currency: commission.currency,
      baseAmount: commission.companyAmount,
      netAmount: commission.companyAmount,
      description: `Company payout for transaction ${parentTransactionId}`,
      status: TransactionStatus.COMPLETED,
      processedAt: new Date(),
    });
  }

  private generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private async getExchangeRate(currency: Currency): Promise<number> {
    try {
      const exchangeRate = await this.exchangeRateService.getExchangeRate(currency, Currency.USD);
      return exchangeRate.rate;
    } catch (error) {
      this.logger.error(`Failed to get exchange rate for ${currency}: ${error.message}`);
      // Fallback to hardcoded rates
      const fallbackRates = {
        [Currency.KES]: 0.0077, // 1 KES = 0.0077 USD
        [Currency.EUR]: 1.09,   // 1 EUR = 1.09 USD
        [Currency.GBP]: 1.27,   // 1 GBP = 1.27 USD
        [Currency.USD]: 1.0,    // 1 USD = 1 USD
      };
      
      return fallbackRates[currency] || 1.0;
    }
  }
}
