import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DynamicCommissionService, CommissionCalculationRequest } from './services/dynamic-commission.service';
import { CommissionManagementService, CreatePlatformCommissionDto, CreateCommissionTierDto, CreateCompanyCommissionDto } from './services/commission-management.service';
import { BookingType } from '../../common/entities/platform-commission.entity';
import { TierType } from '../../common/entities/commission-tier.entity';

@ApiTags('Commission Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commission')
export class CommissionController {
  constructor(
    private readonly dynamicCommissionService: DynamicCommissionService,
    private readonly commissionManagementService: CommissionManagementService,
  ) {}

  @Post('calculate')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Calculate commission for a booking' })
  @ApiResponse({ status: 200, description: 'Commission calculated successfully' })
  async calculateCommission(@Body() request: CommissionCalculationRequest) {
    const result = await this.dynamicCommissionService.calculateCommission(request);
    return {
      success: true,
      data: result,
    };
  }

  @Post('platform')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Create platform commission configuration' })
  @ApiResponse({ status: 201, description: 'Platform commission created successfully' })
  async createPlatformCommission(@Body() dto: CreatePlatformCommissionDto) {
    const commission = await this.commissionManagementService.createPlatformCommission(dto);
    return {
      success: true,
      message: 'Platform commission created successfully',
      data: commission,
    };
  }

  @Get('platform')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get platform commission configurations' })
  @ApiResponse({ status: 200, description: 'Platform commissions retrieved successfully' })
  async getPlatformCommissions(@Query('bookingType') bookingType?: BookingType) {
    const commissions = await this.commissionManagementService.getPlatformCommissions(bookingType);
    return {
      success: true,
      data: commissions,
    };
  }

  @Get('platform/active/:bookingType')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get active platform commission for booking type' })
  @ApiResponse({ status: 200, description: 'Active platform commission retrieved successfully' })
  async getActivePlatformCommission(@Param('bookingType') bookingType: BookingType) {
    const commission = await this.commissionManagementService.getActivePlatformCommission(bookingType);
    return {
      success: true,
      data: commission,
    };
  }

  @Post('tier')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Create commission tier' })
  @ApiResponse({ status: 201, description: 'Commission tier created successfully' })
  async createCommissionTier(@Body() dto: CreateCommissionTierDto) {
    const tier = await this.commissionManagementService.createCommissionTier(dto);
    return {
      success: true,
      message: 'Commission tier created successfully',
      data: tier,
    };
  }

  @Get('tier')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get commission tiers' })
  @ApiResponse({ status: 200, description: 'Commission tiers retrieved successfully' })
  async getCommissionTiers(@Query('platformCommissionId') platformCommissionId?: number) {
    const tiers = await this.commissionManagementService.getCommissionTiers(platformCommissionId);
    return {
      success: true,
      data: tiers,
    };
  }

  @Post('company')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Create company-specific commission' })
  @ApiResponse({ status: 201, description: 'Company commission created successfully' })
  async createCompanyCommission(@Body() dto: CreateCompanyCommissionDto) {
    const commission = await this.commissionManagementService.createCompanyCommission(dto);
    return {
      success: true,
      message: 'Company commission created successfully',
      data: commission,
    };
  }

  @Get('company')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get company commission configurations' })
  @ApiResponse({ status: 200, description: 'Company commissions retrieved successfully' })
  async getCompanyCommissions(@Query('companyId') companyId?: number) {
    const commissions = await this.commissionManagementService.getCompanyCommissions(companyId);
    return {
      success: true,
      data: commissions,
    };
  }

  @Get('company/active/:companyId/:bookingType')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get active company commission' })
  @ApiResponse({ status: 200, description: 'Active company commission retrieved successfully' })
  async getActiveCompanyCommission(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('bookingType') bookingType: BookingType,
  ) {
    const commission = await this.commissionManagementService.getActiveCompanyCommission(companyId, bookingType);
    return {
      success: true,
      data: commission,
    };
  }

  @Get('history')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get commission change history' })
  @ApiResponse({ status: 200, description: 'Commission history retrieved successfully' })
  async getCommissionHistory(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: number,
    @Query('limit') limit: number = 50,
  ) {
    const history = await this.commissionManagementService.getCommissionHistory(
      entityType as any,
      entityId,
      limit,
    );
    return {
      success: true,
      data: history,
    };
  }
}
