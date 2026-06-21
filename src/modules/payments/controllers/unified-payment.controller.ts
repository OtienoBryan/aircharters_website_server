import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UnifiedPaymentService, UnifiedPaymentRequest } from '../services/unified-payment.service';
import { TransactionLedger, TransactionStatus, TransactionType, Currency } from '../../../common/entities/transaction-ledger.entity';
import { PaymentProvider } from '../../../common/entities/company-payment-account.entity';
import { Request } from 'express';

@ApiTags('Unified Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unified-payments')
export class UnifiedPaymentController {
  constructor(
    private readonly unifiedPaymentService: UnifiedPaymentService,
  ) {}

  @Post('process')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Process payment with automatic provider selection' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number' },
        companyId: { type: 'number' },
        bookingId: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string', enum: ['USD', 'KES', 'EUR', 'GBP'] },
        paymentMethod: { type: 'string', enum: ['card', 'mpesa', 'bank_transfer'] },
        description: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['userId', 'companyId', 'bookingId', 'amount', 'currency', 'paymentMethod', 'description'],
    },
  })
  async processPayment(@Body() request: UnifiedPaymentRequest, @Req() req: Request) {
    // Add IP address and user agent from request
    const enhancedRequest = {
      ...request,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await this.unifiedPaymentService.processPayment(enhancedRequest);
    return {
      success: true,
      message: 'Payment processed successfully',
      data: result,
    };
  }

  @Post('confirm/:transactionId')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Confirm a pending payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  async confirmPayment(
    @Param('transactionId') transactionId: string,
    @Body() body: { paymentMethodId?: string },
  ) {
    const result = await this.unifiedPaymentService.confirmPayment(transactionId, body.paymentMethodId);
    return {
      success: true,
      message: 'Payment confirmed successfully',
      data: result,
    };
  }

  @Get('transaction/:transactionId')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Get transaction details by ID' })
  @ApiResponse({ status: 200, description: 'Transaction details retrieved successfully' })
  async getTransaction(@Param('transactionId') transactionId: string) {
    const transaction = await this.unifiedPaymentService.getTransactionById(transactionId);
    if (!transaction) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }
    return {
      success: true,
      data: transaction,
    };
  }

  @Get('company/:companyId/transactions')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get company transactions with filters' })
  @ApiResponse({ status: 200, description: 'Company transactions retrieved successfully' })
  async getCompanyTransactions(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('provider') provider?: PaymentProvider,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      type,
      provider,
    };

    const result = await this.unifiedPaymentService.getTransactionsByCompany(
      companyId,
      filters,
      parseInt(page),
      parseInt(limit),
    );

    return {
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.total / parseInt(limit)),
      },
    };
  }

  @Get('company/:companyId/summary')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get company transaction summary' })
  @ApiResponse({ status: 200, description: 'Transaction summary retrieved successfully' })
  async getCompanySummary(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('currency') currency: Currency = Currency.USD,
  ) {
    const summary = await this.unifiedPaymentService.getTransactionSummary(
      companyId,
      new Date(startDate),
      new Date(endDate),
      currency,
    );

    return {
      success: true,
      data: summary,
    };
  }

  @Get('reconciliation-report')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get reconciliation report' })
  @ApiResponse({ status: 200, description: 'Reconciliation report retrieved successfully' })
  async getReconciliationReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('provider') provider?: PaymentProvider,
  ) {
    const report = await this.unifiedPaymentService.getReconciliationReport(
      new Date(startDate),
      new Date(endDate),
      provider,
    );

    return {
      success: true,
      data: report,
    };
  }

  @Get('ledger/transactions')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get all transactions with advanced filtering' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getAllTransactions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('provider') provider?: PaymentProvider,
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    // This would be implemented in the service for admin-level access
    // For now, return a placeholder response
    return {
      success: true,
      message: 'Advanced ledger filtering will be implemented',
      data: [],
    };
  }

  @Get('ledger/export')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Export transaction ledger to CSV/Excel' })
  @ApiResponse({ status: 200, description: 'Ledger exported successfully' })
  async exportLedger(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Query('provider') provider?: PaymentProvider,
    @Query('companyId') companyId?: string,
  ) {
    // This would generate and return a file download
    return {
      success: true,
      message: 'Ledger export functionality will be implemented',
      data: {
        format,
        period: { startDate, endDate },
        provider,
        companyId,
      },
    };
  }

  @Get('dashboard/stats')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get payment dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats(
    @Query('period') period: 'today' | 'week' | 'month' | 'year' = 'month',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // This would aggregate statistics from the ledger
    const stats = {
      period,
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      totalPayouts: 0,
      byProvider: {},
      byStatus: {},
      byType: {},
    };

    return {
      success: true,
      data: stats,
    };
  }
}
