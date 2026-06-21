import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyPaymentAccount, PaymentProvider, AccountStatus, AccountType } from '../../../common/entities/company-payment-account.entity';
import { ChartersCompany } from '../../../common/entities/charters-company.entity';
import { StripeConnectProvider, CreateConnectAccountDto } from '../providers/stripe-connect.provider';
import { MpesaMerchantProvider, CreateMerchantAccountDto } from '../providers/mpesa-merchant.provider';

export interface OnboardCompanyDto {
  companyId: number;
  paymentProvider: PaymentProvider;
  accountType?: AccountType;
  country: string;
  currency?: string;
}

export interface OnboardingStatus {
  accountId: string;
  status: AccountStatus;
  verificationStatus: string;
  requirements: any;
  capabilities: any;
  onboardingUrl?: string;
  dashboardUrl?: string;
  isComplete: boolean;
}

@Injectable()
export class CompanyOnboardingService {
  private readonly logger = new Logger(CompanyOnboardingService.name);

  constructor(
    @InjectRepository(CompanyPaymentAccount)
    private companyPaymentAccountRepository: Repository<CompanyPaymentAccount>,
    @InjectRepository(ChartersCompany)
    private companyRepository: Repository<ChartersCompany>,
    private stripeConnectProvider: StripeConnectProvider,
    private mpesaMerchantProvider: MpesaMerchantProvider,
  ) {}

  async onboardCompany(dto: OnboardCompanyDto): Promise<OnboardingStatus> {
    this.logger.log(`Starting onboarding for company ${dto.companyId} with ${dto.paymentProvider}`);

    // Check if company exists
    const company = await this.companyRepository.findOne({
      where: { id: dto.companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${dto.companyId} not found`);
    }

    // Check if payment account already exists
    const existingAccount = await this.companyPaymentAccountRepository.findOne({
      where: {
        companyId: dto.companyId,
        paymentProvider: dto.paymentProvider,
        isActive: true,
      },
    });

    if (existingAccount) {
      throw new BadRequestException(`Company ${dto.companyId} already has an active ${dto.paymentProvider} account`);
    }

    // Create payment account based on provider
    switch (dto.paymentProvider) {
      case PaymentProvider.STRIPE:
        return await this.onboardStripeAccount(dto, company);
      case PaymentProvider.MPESA:
        return await this.onboardMpesaAccount(dto, company);
      default:
        throw new BadRequestException(`Unsupported payment provider: ${dto.paymentProvider}`);
    }
  }

  private async onboardStripeAccount(dto: OnboardCompanyDto, company: ChartersCompany): Promise<OnboardingStatus> {
    try {
      // Create Stripe Connect account
      const stripeAccountDto: CreateConnectAccountDto = {
        companyId: dto.companyId,
        email: company.email,
        country: dto.country,
        businessType: 'airline_charter',
        companyName: company.companyName,
        phone: company.mobileNumber,
      };

      const stripeResponse = await this.stripeConnectProvider.createConnectAccount(stripeAccountDto);

      // Save to database
      const paymentAccount = this.companyPaymentAccountRepository.create({
        companyId: dto.companyId,
        paymentProvider: PaymentProvider.STRIPE,
        accountType: dto.accountType || AccountType.EXPRESS,
        accountId: stripeResponse.accountId,
        accountStatus: AccountStatus.PENDING,
        verificationStatus: 'pending',
        country: dto.country,
        currency: dto.currency || 'USD',
        capabilities: stripeResponse.capabilities,
        requirements: stripeResponse.requirements,
        onboardingUrl: stripeResponse.onboardingUrl,
        dashboardUrl: stripeResponse.dashboardUrl,
        isActive: true,
      });

      const savedAccount = await this.companyPaymentAccountRepository.save(paymentAccount);

      this.logger.log(`Stripe account created for company ${dto.companyId}: ${stripeResponse.accountId}`);

      return {
        accountId: savedAccount.accountId,
        status: savedAccount.accountStatus,
        verificationStatus: savedAccount.verificationStatus,
        requirements: savedAccount.requirements,
        capabilities: savedAccount.capabilities,
        onboardingUrl: savedAccount.onboardingUrl,
        dashboardUrl: savedAccount.dashboardUrl,
        isComplete: this.isOnboardingComplete(savedAccount),
      };
    } catch (error) {
      this.logger.error(`Failed to onboard Stripe account for company ${dto.companyId}`, error);
      throw error;
    }
  }

  private async onboardMpesaAccount(dto: OnboardCompanyDto, company: ChartersCompany): Promise<OnboardingStatus> {
    try {
      // Create M-Pesa merchant account
      const mpesaAccountDto: CreateMerchantAccountDto = {
        companyId: dto.companyId,
        businessName: company.companyName,
        phoneNumber: company.mobileNumber,
        businessType: 'airline_charter',
        documents: [], // Will be populated with actual documents
        bankAccount: {
          accountNumber: '', // Will be provided during onboarding
          bankCode: '',
          accountName: company.companyName,
        },
      };

      const mpesaResponse = await this.mpesaMerchantProvider.createMerchantAccount(mpesaAccountDto);

      // Save to database
      const paymentAccount = this.companyPaymentAccountRepository.create({
        companyId: dto.companyId,
        paymentProvider: PaymentProvider.MPESA,
        accountType: dto.accountType || AccountType.EXPRESS,
        accountId: mpesaResponse.merchantId,
        accountStatus: AccountStatus.PENDING,
        verificationStatus: 'pending',
        country: dto.country,
        currency: dto.currency || 'KES',
        capabilities: {
          stkPush: true,
          accountBalance: true,
          transactions: true,
        },
        requirements: mpesaResponse.requirements,
        businessProfile: {
          businessName: company.companyName,
          phoneNumber: company.mobileNumber,
          businessType: 'airline_charter',
        },
        metadata: {
          businessShortCode: mpesaResponse.businessShortCode,
        },
        isActive: true,
      });

      const savedAccount = await this.companyPaymentAccountRepository.save(paymentAccount);

      this.logger.log(`M-Pesa merchant account created for company ${dto.companyId}: ${mpesaResponse.merchantId}`);

      return {
        accountId: savedAccount.accountId,
        status: savedAccount.accountStatus,
        verificationStatus: savedAccount.verificationStatus,
        requirements: savedAccount.requirements,
        capabilities: savedAccount.capabilities,
        isComplete: this.isOnboardingComplete(savedAccount),
      };
    } catch (error) {
      this.logger.error(`Failed to onboard M-Pesa account for company ${dto.companyId}`, error);
      throw error;
    }
  }

  async getOnboardingStatus(companyId: number, paymentProvider: PaymentProvider): Promise<OnboardingStatus | null> {
    const account = await this.companyPaymentAccountRepository.findOne({
      where: {
        companyId,
        paymentProvider,
        isActive: true,
      },
    });

    if (!account) {
      return null;
    }

    // For Stripe accounts, get updated status from Stripe
    if (paymentProvider === PaymentProvider.STRIPE) {
      try {
        const stripeAccount = await this.stripeConnectProvider.getConnectAccount(account.accountId);
        
        // Update local status
        account.accountStatus = this.mapStripeStatus(stripeAccount.charges_enabled);
        account.verificationStatus = this.mapStripeVerificationStatus(stripeAccount.requirements);
        account.capabilities = stripeAccount.capabilities;
        account.requirements = stripeAccount.requirements;
        
        await this.companyPaymentAccountRepository.save(account);
      } catch (error) {
        this.logger.error(`Failed to get updated status from Stripe for account ${account.accountId}`, error);
      }
    }

    // For M-Pesa accounts, get updated status from M-Pesa
    if (paymentProvider === PaymentProvider.MPESA) {
      try {
        const mpesaBalance = await this.mpesaMerchantProvider.getMerchantBalance(account.accountId);
        
        // Update local status based on balance availability
        account.accountStatus = mpesaBalance ? AccountStatus.ACTIVE : AccountStatus.PENDING;
        account.verificationStatus = 'verified'; // M-Pesa accounts are pre-verified
        
        await this.companyPaymentAccountRepository.save(account);
      } catch (error) {
        this.logger.error(`Failed to get updated status from M-Pesa for account ${account.accountId}`, error);
      }
    }

    return {
      accountId: account.accountId,
      status: account.accountStatus,
      verificationStatus: account.verificationStatus,
      requirements: account.requirements,
      capabilities: account.capabilities,
      onboardingUrl: account.onboardingUrl,
      dashboardUrl: account.dashboardUrl,
      isComplete: this.isOnboardingComplete(account),
    };
  }

  async refreshOnboardingLink(companyId: number, paymentProvider: PaymentProvider): Promise<string> {
    const account = await this.companyPaymentAccountRepository.findOne({
      where: {
        companyId,
        paymentProvider,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`No active ${paymentProvider} account found for company ${companyId}`);
    }

    if (paymentProvider === PaymentProvider.STRIPE) {
      const refreshUrl = `${process.env.FRONTEND_URL}/company/onboarding/refresh`;
      const returnUrl = `${process.env.FRONTEND_URL}/company/onboarding/complete`;
      
      const onboardingUrl = await this.stripeConnectProvider.createAccountLink(
        account.accountId,
        refreshUrl,
        returnUrl,
      );

      // Update the onboarding URL
      account.onboardingUrl = onboardingUrl;
      await this.companyPaymentAccountRepository.save(account);

      return onboardingUrl;
    }

    if (paymentProvider === PaymentProvider.MPESA) {
      // For M-Pesa, return the merchant dashboard URL
      const dashboardUrl = `${process.env.FRONTEND_URL}/company/mpesa-dashboard/${account.accountId}`;
      
      // Update the dashboard URL
      account.dashboardUrl = dashboardUrl;
      await this.companyPaymentAccountRepository.save(account);

      return dashboardUrl;
    }

    throw new BadRequestException(`Refresh not supported for ${paymentProvider}`);
  }

  async getCompanyPaymentAccounts(companyId: number): Promise<CompanyPaymentAccount[]> {
    return await this.companyPaymentAccountRepository.find({
      where: {
        companyId,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async deactivateAccount(accountId: string): Promise<void> {
    const account = await this.companyPaymentAccountRepository.findOne({
      where: { accountId },
    });

    if (!account) {
      throw new NotFoundException(`Payment account ${accountId} not found`);
    }

    account.isActive = false;
    account.accountStatus = AccountStatus.SUSPENDED;
    await this.companyPaymentAccountRepository.save(account);

    this.logger.log(`Payment account ${accountId} deactivated`);
  }

  private isOnboardingComplete(account: CompanyPaymentAccount): boolean {
    if (account.paymentProvider === PaymentProvider.STRIPE) {
      return account.accountStatus === AccountStatus.ACTIVE && 
             account.verificationStatus === 'verified';
    }
    
    return account.accountStatus === AccountStatus.ACTIVE;
  }

  private mapStripeStatus(chargesEnabled: boolean): AccountStatus {
    return chargesEnabled ? AccountStatus.ACTIVE : AccountStatus.PENDING;
  }

  private mapStripeVerificationStatus(requirements: any): string {
    if (!requirements) return 'pending';
    
    const currentlyDue = requirements.currently_due || [];
    const eventuallyDue = requirements.eventually_due || [];
    
    if (currentlyDue.length === 0 && eventuallyDue.length === 0) {
      return 'verified';
    } else if (currentlyDue.length > 0) {
      return 'pending';
    } else {
      return 'partially_verified';
    }
  }
}
