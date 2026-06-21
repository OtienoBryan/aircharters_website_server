import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformCommission } from '../../common/entities/platform-commission.entity';
import { CommissionTier } from '../../common/entities/commission-tier.entity';
import { CompanyCommission } from '../../common/entities/company-commission.entity';
import { CommissionHistory } from '../../common/entities/commission-history.entity';
import { DynamicCommissionService } from './services/dynamic-commission.service';
import { CommissionManagementService } from './services/commission-management.service';
import { CommissionController } from './commission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformCommission,
      CommissionTier,
      CompanyCommission,
      CommissionHistory,
    ]),
  ],
  controllers: [CommissionController],
  providers: [
    DynamicCommissionService,
    CommissionManagementService,
  ],
  exports: [
    DynamicCommissionService,
    CommissionManagementService,
  ],
})
export class CommissionModule {}
