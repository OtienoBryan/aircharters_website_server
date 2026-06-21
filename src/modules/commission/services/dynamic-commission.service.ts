import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { PlatformCommission, CommissionType, BookingType } from '../../../common/entities/platform-commission.entity';
import { CommissionTier, TierType } from '../../../common/entities/commission-tier.entity';
import { CompanyCommission } from '../../../common/entities/company-commission.entity';
import { CommissionHistory, CommissionChangeType, CommissionEntityType } from '../../../common/entities/commission-history.entity';

export interface CommissionCalculationRequest {
  companyId: number;
  bookingType: BookingType;
  totalAmount: number;
  currency: string;
  tierType?: TierType;
  effectiveDate?: Date;
}

export interface CommissionCalculationResult {
  platformCommission: number;
  companyAmount: number;
  commissionRate: number;
  commissionType: CommissionType;
  tierType?: TierType;
  currency: string;
  calculationDetails: {
    baseRate: number;
    appliedRate: number;
    minCommission?: number;
    maxCommission?: number;
    fixedAmount?: number;
  };
}

@Injectable()
export class DynamicCommissionService {
  private readonly logger = new Logger(DynamicCommissionService.name);

  constructor(
    @InjectRepository(PlatformCommission)
    private platformCommissionRepository: Repository<PlatformCommission>,
    @InjectRepository(CommissionTier)
    private commissionTierRepository: Repository<CommissionTier>,
    @InjectRepository(CompanyCommission)
    private companyCommissionRepository: Repository<CompanyCommission>,
    @InjectRepository(CommissionHistory)
    private commissionHistoryRepository: Repository<CommissionHistory>,
  ) {}

  async calculateCommission(request: CommissionCalculationRequest): Promise<CommissionCalculationResult> {
    const { companyId, bookingType, totalAmount, currency, tierType, effectiveDate } = request;
    const effectiveDateToUse = effectiveDate || new Date();

    this.logger.log(`Calculating commission for company ${companyId}, booking type: ${bookingType}, amount: ${totalAmount} ${currency}`);

    // 1. Check for company-specific commission first
    const companyCommission = await this.getCompanyCommission(companyId, bookingType, effectiveDateToUse);
    
    if (companyCommission) {
      return this.calculateWithCompanyCommission(companyCommission, totalAmount, currency);
    }

    // 2. Check for tier-based commission
    if (tierType) {
      const tierCommission = await this.getTierCommission(tierType, bookingType, effectiveDateToUse);
      if (tierCommission) {
        return this.calculateWithTierCommission(tierCommission, totalAmount, currency);
      }
    }

    // 3. Use default platform commission
    const platformCommission = await this.getPlatformCommission(bookingType, effectiveDateToUse);
    if (!platformCommission) {
      throw new Error(`No commission configuration found for booking type: ${bookingType}`);
    }

    return this.calculateWithPlatformCommission(platformCommission, totalAmount, currency);
  }

  private async getCompanyCommission(companyId: number, bookingType: BookingType, effectiveDate: Date): Promise<CompanyCommission | null> {
    return await this.companyCommissionRepository.findOne({
      where: {
        companyId,
        isActive: true,
        effectiveFrom: LessThanOrEqual(effectiveDate),
        effectiveTo: MoreThanOrEqual(effectiveDate),
        platformCommission: {
          bookingType,
          isActive: true,
        },
      },
      relations: ['platformCommission'],
      order: { effectiveFrom: 'DESC' },
    });
  }

  private async getTierCommission(tierType: TierType, bookingType: BookingType, effectiveDate: Date): Promise<CommissionTier | null> {
    return await this.commissionTierRepository.findOne({
      where: {
        tierType,
        isActive: true,
        effectiveFrom: LessThanOrEqual(effectiveDate),
        effectiveTo: MoreThanOrEqual(effectiveDate),
        platformCommission: {
          bookingType,
          isActive: true,
        },
      },
      relations: ['platformCommission'],
      order: { effectiveFrom: 'DESC' },
    });
  }

  private async getPlatformCommission(bookingType: BookingType, effectiveDate: Date): Promise<PlatformCommission | null> {
    return await this.platformCommissionRepository.findOne({
      where: {
        bookingType,
        isActive: true,
        effectiveFrom: LessThanOrEqual(effectiveDate),
        effectiveTo: MoreThanOrEqual(effectiveDate),
      },
      order: { effectiveFrom: 'DESC' },
    });
  }

  private calculateWithCompanyCommission(companyCommission: CompanyCommission, totalAmount: number, currency: string): CommissionCalculationResult {
    const { percentageRate, fixedAmount, minCommission, maxCommission } = companyCommission;
    const commissionType = companyCommission.platformCommission.commissionType;

    let platformCommission = 0;
    let appliedRate = 0;

    if (commissionType === CommissionType.PERCENTAGE && percentageRate) {
      appliedRate = percentageRate;
      platformCommission = (totalAmount * percentageRate) / 100;
    } else if (commissionType === CommissionType.FIXED_AMOUNT && fixedAmount) {
      platformCommission = fixedAmount;
      appliedRate = (fixedAmount / totalAmount) * 100;
    } else if (commissionType === CommissionType.HYBRID) {
      const percentageAmount = percentageRate ? (totalAmount * percentageRate) / 100 : 0;
      const fixedAmountValue = fixedAmount || 0;
      platformCommission = percentageAmount + fixedAmountValue;
      appliedRate = (platformCommission / totalAmount) * 100;
    }

    // Apply min/max constraints
    if (minCommission && platformCommission < minCommission) {
      platformCommission = minCommission;
      appliedRate = (minCommission / totalAmount) * 100;
    }
    if (maxCommission && platformCommission > maxCommission) {
      platformCommission = maxCommission;
      appliedRate = (maxCommission / totalAmount) * 100;
    }

    return {
      platformCommission,
      companyAmount: totalAmount - platformCommission,
      commissionRate: appliedRate,
      commissionType,
      currency,
      calculationDetails: {
        baseRate: percentageRate || 0,
        appliedRate,
        minCommission,
        maxCommission,
        fixedAmount,
      },
    };
  }

  private calculateWithTierCommission(tierCommission: CommissionTier, totalAmount: number, currency: string): CommissionCalculationResult {
    const { percentageRate, fixedAmount, minCommission, maxCommission } = tierCommission;
    const commissionType = tierCommission.platformCommission.commissionType;

    let platformCommission = 0;
    let appliedRate = 0;

    if (commissionType === CommissionType.PERCENTAGE && percentageRate) {
      appliedRate = percentageRate;
      platformCommission = (totalAmount * percentageRate) / 100;
    } else if (commissionType === CommissionType.FIXED_AMOUNT && fixedAmount) {
      platformCommission = fixedAmount;
      appliedRate = (fixedAmount / totalAmount) * 100;
    } else if (commissionType === CommissionType.HYBRID) {
      const percentageAmount = percentageRate ? (totalAmount * percentageRate) / 100 : 0;
      const fixedAmountValue = fixedAmount || 0;
      platformCommission = percentageAmount + fixedAmountValue;
      appliedRate = (platformCommission / totalAmount) * 100;
    }

    // Apply min/max constraints
    if (minCommission && platformCommission < minCommission) {
      platformCommission = minCommission;
      appliedRate = (minCommission / totalAmount) * 100;
    }
    if (maxCommission && platformCommission > maxCommission) {
      platformCommission = maxCommission;
      appliedRate = (maxCommission / totalAmount) * 100;
    }

    return {
      platformCommission,
      companyAmount: totalAmount - platformCommission,
      commissionRate: appliedRate,
      commissionType,
      tierType: tierCommission.tierType,
      currency,
      calculationDetails: {
        baseRate: percentageRate || 0,
        appliedRate,
        minCommission,
        maxCommission,
        fixedAmount,
      },
    };
  }

  private calculateWithPlatformCommission(platformCommission: PlatformCommission, totalAmount: number, currency: string): CommissionCalculationResult {
    const { percentageRate, fixedAmount, minCommission, maxCommission, commissionType } = platformCommission;

    let platformCommissionAmount = 0;
    let appliedRate = 0;

    if (commissionType === CommissionType.PERCENTAGE && percentageRate) {
      appliedRate = percentageRate;
      platformCommissionAmount = (totalAmount * percentageRate) / 100;
    } else if (commissionType === CommissionType.FIXED_AMOUNT && fixedAmount) {
      platformCommissionAmount = fixedAmount;
      appliedRate = (fixedAmount / totalAmount) * 100;
    } else if (commissionType === CommissionType.HYBRID) {
      const percentageAmount = percentageRate ? (totalAmount * percentageRate) / 100 : 0;
      const fixedAmountValue = fixedAmount || 0;
      platformCommissionAmount = percentageAmount + fixedAmountValue;
      appliedRate = (platformCommissionAmount / totalAmount) * 100;
    }

    // Apply min/max constraints
    if (minCommission && platformCommissionAmount < minCommission) {
      platformCommissionAmount = minCommission;
      appliedRate = (minCommission / totalAmount) * 100;
    }
    if (maxCommission && platformCommissionAmount > maxCommission) {
      platformCommissionAmount = maxCommission;
      appliedRate = (maxCommission / totalAmount) * 100;
    }

    return {
      platformCommission: platformCommissionAmount,
      companyAmount: totalAmount - platformCommissionAmount,
      commissionRate: appliedRate,
      commissionType,
      currency,
      calculationDetails: {
        baseRate: percentageRate || 0,
        appliedRate,
        minCommission,
        maxCommission,
        fixedAmount,
      },
    };
  }

  async logCommissionChange(
    entityType: CommissionEntityType,
    entityId: number,
    changeType: CommissionChangeType,
    oldValues: any,
    newValues: any,
    changedBy: string,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const history = this.commissionHistoryRepository.create({
      entityType,
      entityId,
      changeType,
      oldValues,
      newValues,
      changedBy,
      changeReason,
      ipAddress,
      userAgent,
    });

    await this.commissionHistoryRepository.save(history);
    this.logger.log(`Commission change logged: ${changeType} for ${entityType} ${entityId} by ${changedBy}`);
  }
}
