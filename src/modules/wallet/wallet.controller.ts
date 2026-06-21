import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Get user wallet transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getUserTransactions(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const userId = req.user.id;
    return await this.walletService.getUserTransactions(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('loyalty/transactions')
  @ApiOperation({ summary: 'Get user loyalty transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Loyalty transactions retrieved successfully' })
  async getLoyaltyTransactions(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const userId = req.user.id;
    return await this.walletService.getLoyaltyTransactions(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('money/transactions')
  @ApiOperation({ summary: 'Get user monetary transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Monetary transactions retrieved successfully' })
  async getMonetaryTransactions(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const userId = req.user.id;
    return await this.walletService.getMonetaryTransactions(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('loyalty/summary')
  @ApiOperation({ summary: 'Get loyalty points summary with conversion rates' })
  @ApiResponse({ status: 200, description: 'Loyalty summary retrieved successfully' })
  async getLoyaltySummary(@Request() req) {
    const userId = req.user.id;
    return await this.walletService.getLoyaltySummary(userId);
  }

  @Post('loyalty/earn')
  @ApiOperation({ summary: 'Earn loyalty points (direct miles)' })
  @ApiResponse({ status: 201, description: 'Loyalty points earned successfully' })
  async earnLoyaltyPoints(
    @Request() req,
    @Body() body: {
      points: number;
      description: string;
      bookingId?: string;
      expiresAt?: string;
    },
  ) {
    const userId = req.user.id;
    return await this.walletService.earnLoyaltyPoints(
      userId,
      body.points,
      body.description,
      body.bookingId,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  @Post('loyalty/earn-from-spending')
  @ApiOperation({ summary: 'Earn loyalty points from USD spending (1 USD = 5 miles)' })
  @ApiResponse({ status: 201, description: 'Loyalty points earned from spending successfully' })
  async earnLoyaltyPointsFromSpending(
    @Request() req,
    @Body() body: {
      usdAmount: number;
      description: string;
      bookingId?: string;
      expiresAt?: string;
    },
  ) {
    const userId = req.user.id;
    return await this.walletService.earnLoyaltyPointsFromSpending(
      userId,
      body.usdAmount,
      body.description,
      body.bookingId,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  @Post('loyalty/redeem')
  @ApiOperation({ summary: 'Redeem loyalty points for USD discount (100 miles = $1 off)' })
  @ApiResponse({ status: 201, description: 'Loyalty points redeemed successfully' })
  async redeemLoyaltyPoints(
    @Request() req,
    @Body() body: {
      miles: number;
      description: string;
      bookingId?: string;
    },
  ) {
    const userId = req.user.id;
    return await this.walletService.redeemLoyaltyPoints(
      userId,
      body.miles,
      body.description,
      body.bookingId,
    );
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit money to wallet' })
  @ApiResponse({ status: 201, description: 'Money deposited successfully' })
  async depositMoney(
    @Request() req,
    @Body() body: {
      amount: number;
      description: string;
      paymentMethod: string;
      paymentReference?: string;
    },
  ) {
    const userId = req.user.id;
    return await this.walletService.depositMoney(
      userId,
      body.amount,
      body.description,
      body.paymentMethod,
      body.paymentReference,
    );
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw money from wallet' })
  @ApiResponse({ status: 201, description: 'Money withdrawn successfully' })
  async withdrawMoney(
    @Request() req,
    @Body() body: {
      amount: number;
      description: string;
      paymentMethod: string;
      paymentReference?: string;
    },
  ) {
    const userId = req.user.id;
    return await this.walletService.withdrawMoney(
      userId,
      body.amount,
      body.description,
      body.paymentMethod,
      body.paymentReference,
    );
  }
} 