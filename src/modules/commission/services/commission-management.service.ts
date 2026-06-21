import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformCommission, CommissionType, BookingType } from '../../../common/entities/platform-commission.entity';
import { CommissionTier, TierType } from '../../../common/entities/commission-tier.entity';
import { CompanyCommission } from '../../../common/entities/company-commission.entity';
import { CommissionHistory, CommissionChangeType, CommissionEntityType } from '../../../common/entities/commission-history.entity';
import { DynamicCommissionService } from './dynamic-commission.service';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

export interface CreatePlatformCommissionDto {
  commissionType: CommissionType;
  bookingType: BookingType;
  percentageRate?: number;
  fixedAmount?: number;
  currency: string;
  minCommission?: number;
  maxCommission?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  description?: string;
  createdBy: string;
}

export interface CreateCommissionTierDto {
  tierType: TierType;
  tierName: string;
  percentageRate: number;
  fixedAmount?: number;
  currency: string;
  minCommission?: number;
  maxCommission?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  description?: string;
  platformCommissionId: number;
}

export interface CreateCompanyCommissionDto {
  companyId: number;
  platformCommissionId: number;
  percentageRate?: number;
  fixedAmount?: number;
  currency: string;
  minCommission?: number;
  maxCommission?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  description?: string;
  createdBy: string;
}

@Injectable()
export class CommissionManagementService {
  private readonly logger = new Logger(CommissionManagementService.name);

  constructor(
    @InjectRepository(PlatformCommission)
    private platformCommissionRepository: Repository<PlatformCommission>,
    @InjectRepository(CommissionTier)
    private commissionTierRepository: Repository<CommissionTier>,
    @InjectRepository(CompanyCommission)
    private companyCommissionRepository: Repository<CompanyCommission>,
    @InjectRepository(CommissionHistory)
    private commissionHistoryRepository: Repository<CommissionHistory>,
    private dynamicCommissionService: DynamicCommissionService,
  ) {}

  // Platform Commission Management
  async createPlatformCommission(dto: CreatePlatformCommissionDto): Promise<PlatformCommission> {
    // Validate commission type and required fields
    this.validateCommissionType(dto.commissionType, dto.percentageRate, dto.fixedAmount);

    const commission = this.platformCommissionRepository.create(dto);
    const savedCommission = await this.platformCommissionRepository.save(commission);

    // Log the creation
    await this.dynamicCommissionService.logCommissionChange(
      CommissionEntityType.PLATFORM,
      savedCommission.id,
      CommissionChangeType.CREATED,
      null,
      savedCommission,
      dto.createdBy,
      'Platform commission created',
    );

    this.logger.log(`Platform commission created: ${savedCommission.id} for ${dto.bookingType}`);
    return savedCommission;
  }

  async updatePlatformCommission(
    id: number,
    updates: Partial<CreatePlatformCommissionDto>,
    updatedBy: string,
    reason?: string,
  ): Promise<PlatformCommission> {
    const commission = await this.platformCommissionRepository.findOne({ where: { id } });
    if (!commission) {
      throw new NotFoundException(`Platform commission with ID ${id} not found`);
    }

    // Validate commission type if being updated
    if (updates.commissionType) {
      this.validateCommissionType(updates.commissionType, updates.percentageRate, updates.fixedAmount);
    }

    const oldValues = { ...commission };
    Object.assign(commission, updates);
    const updatedCommission = await this.platformCommissionRepository.save(commission);

    // Log the update
    await this.dynamicCommissionService.logCommissionChange(
      CommissionEntityType.PLATFORM,
      id,
      CommissionChangeType.UPDATED,
      oldValues,
      updatedCommission,
      updatedBy,
      reason,
    );

    this.logger.log(`Platform commission updated: ${id} by ${updatedBy}`);
    return updatedCommission;
  }

  async getPlatformCommissions(bookingType?: BookingType): Promise<PlatformCommission[]> {
    const query = this.platformCommissionRepository.createQueryBuilder('pc');
    
    if (bookingType) {
      query.where('pc.bookingType = :bookingType', { bookingType });
    }
    
    return await query.orderBy('pc.effectiveFrom', 'DESC').getMany();
  }

  async getActivePlatformCommission(bookingType: BookingType): Promise<PlatformCommission | null> {
    return await this.platformCommissionRepository.findOne({
      where: {
        bookingType,
        isActive: true,
        effectiveFrom: LessThanOrEqual(new Date()),
        effectiveTo: MoreThanOrEqual(new Date()),
      },
      order: { effectiveFrom: 'DESC' },
    });
  }

  // Commission Tier Management
  async createCommissionTier(dto: CreateCommissionTierDto): Promise<CommissionTier> {
    // Verify platform commission exists
    const platformCommission = await this.platformCommissionRepository.findOne({
      where: { id: dto.platformCommissionId },
    });
    if (!platformCommission) {
      throw new NotFoundException(`Platform commission with ID ${dto.platformCommissionId} not found`);
    }

    const tier = this.commissionTierRepository.create(dto);
    const savedTier = await this.commissionTierRepository.save(tier);

    this.logger.log(`Commission tier created: ${savedTier.id} - ${dto.tierName}`);
    return savedTier;
  }

  async getCommissionTiers(platformCommissionId?: number): Promise<CommissionTier[]> {
    const query = this.commissionTierRepository.createQueryBuilder('tier');
    
    if (platformCommissionId) {
      query.where('tier.platformCommissionId = :platformCommissionId', { platformCommissionId });
    }
    
    return await query
      .leftJoinAndSelect('tier.platformCommission', 'pc')
      .orderBy('tier.effectiveFrom', 'DESC')
      .getMany();
  }

  // Company Commission Management
  async createCompanyCommission(dto: CreateCompanyCommissionDto): Promise<CompanyCommission> {
    // Verify platform commission exists
    const platformCommission = await this.platformCommissionRepository.findOne({
      where: { id: dto.platformCommissionId },
    });
    if (!platformCommission) {
      throw new NotFoundException(`Platform commission with ID ${dto.platformCommissionId} not found`);
    }

    const companyCommission = this.companyCommissionRepository.create(dto);
    const savedCompanyCommission = await this.companyCommissionRepository.save(companyCommission);

    // Log the creation
    await this.dynamicCommissionService.logCommissionChange(
      CommissionEntityType.COMPANY,
      savedCompanyCommission.id,
      CommissionChangeType.CREATED,
      null,
      savedCompanyCommission,
      dto.createdBy,
      'Company commission created',
    );

    this.logger.log(`Company commission created: ${savedCompanyCommission.id} for company ${dto.companyId}`);
    return savedCompanyCommission;
  }

  async getCompanyCommissions(companyId?: number): Promise<CompanyCommission[]> {
    const query = this.companyCommissionRepository.createQueryBuilder('cc');
    
    if (companyId) {
      query.where('cc.companyId = :companyId', { companyId });
    }
    
    return await query
      .leftJoinAndSelect('cc.platformCommission', 'pc')
      .leftJoinAndSelect('cc.company', 'company')
      .orderBy('cc.effectiveFrom', 'DESC')
      .getMany();
  }

  async getActiveCompanyCommission(companyId: number, bookingType: BookingType): Promise<CompanyCommission | null> {
    return await this.companyCommissionRepository.findOne({
      where: {
        companyId,
        isActive: true,
        effectiveFrom: LessThanOrEqual(new Date()),
        effectiveTo: MoreThanOrEqual(new Date()),
        platformCommission: {
          bookingType,
          isActive: true,
        },
      },
      relations: ['platformCommission'],
      order: { effectiveFrom: 'DESC' },
    });
  }

  // Commission History
  async getCommissionHistory(
    entityType?: CommissionEntityType,
    entityId?: number,
    limit: number = 50,
  ): Promise<CommissionHistory[]> {
    const query = this.commissionHistoryRepository.createQueryBuilder('history');
    
    if (entityType) {
      query.andWhere('history.entityType = :entityType', { entityType });
    }
    
    if (entityId) {
      query.andWhere('history.entityId = :entityId', { entityId });
    }
    
    return await query
      .orderBy('history.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  // Validation helpers
  private validateCommissionType(
    commissionType: CommissionType,
    percentageRate?: number,
    fixedAmount?: number,
  ): void {
    switch (commissionType) {
      case CommissionType.PERCENTAGE:
        if (!percentageRate || percentageRate <= 0) {
          throw new BadRequestException('Percentage rate is required and must be greater than 0 for percentage commission type');
        }
        if (percentageRate > 100) {
          throw new BadRequestException('Percentage rate cannot exceed 100%');
        }
        break;

      case CommissionType.FIXED_AMOUNT:
        if (!fixedAmount || fixedAmount <= 0) {
          throw new BadRequestException('Fixed amount is required and must be greater than 0 for fixed amount commission type');
        }
        break;

      case CommissionType.HYBRID:
        if ((!percentageRate || percentageRate <= 0) && (!fixedAmount || fixedAmount <= 0)) {
          throw new BadRequestException('Either percentage rate or fixed amount (or both) must be provided for hybrid commission type');
        }
        if (percentageRate && percentageRate > 100) {
          throw new BadRequestException('Percentage rate cannot exceed 100%');
        }
        break;

      default:
        throw new BadRequestException(`Unsupported commission type: ${commissionType}`);
    }
  }
}
