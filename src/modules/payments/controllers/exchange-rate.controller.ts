import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ExchangeRateService } from '../services/exchange-rate.service';
import { Currency } from '../../../common/entities/transaction-ledger.entity';

@Controller('payments/exchange-rate')
export class ExchangeRateController {
  private readonly logger = new Logger(ExchangeRateController.name);

  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get()
  async getExchangeRate(
    @Query('from') from: Currency,
    @Query('to') to: Currency,
  ) {
    try {
      this.logger.log(`Getting exchange rate: ${from} to ${to}`);
      
      const exchangeRate = await this.exchangeRateService.getExchangeRate(from, to);
      
      return {
        success: true,
        data: {
          from: exchangeRate.from,
          to: exchangeRate.to,
          rate: exchangeRate.rate,
          timestamp: exchangeRate.timestamp,
          source: exchangeRate.source,
        },
        message: `Exchange rate: 1 ${from} = ${exchangeRate.rate} ${to}`,
      };
    } catch (error) {
      this.logger.error(`Failed to get exchange rate: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get exchange rate',
      };
    }
  }

  @Get('convert')
  async convertCurrency(
    @Query('amount') amount: number,
    @Query('from') from: Currency,
    @Query('to') to: Currency,
  ) {
    try {
      this.logger.log(`Converting ${amount} ${from} to ${to}`);
      
      const conversion = await this.exchangeRateService.convertCurrency({
        amount,
        from,
        to,
      });
      
      return {
        success: true,
        data: {
          originalAmount: conversion.originalAmount,
          convertedAmount: conversion.convertedAmount,
          from: conversion.from,
          to: conversion.to,
          rate: conversion.rate,
          timestamp: conversion.timestamp,
        },
        message: `${amount} ${from} = ${conversion.convertedAmount} ${to}`,
      };
    } catch (error) {
      this.logger.error(`Failed to convert currency: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        message: 'Failed to convert currency',
      };
    }
  }

  @Get('usd-to-kes')
  async getUSDToKESRate() {
    try {
      const rate = await this.exchangeRateService.getUSDToKESRate();
      
      return {
        success: true,
        data: {
          from: 'USD',
          to: 'KES',
          rate,
          timestamp: new Date(),
        },
        message: `1 USD = ${rate} KES`,
      };
    } catch (error) {
      this.logger.error(`Failed to get USD to KES rate: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get USD to KES rate',
      };
    }
  }

  @Get('kes-to-usd')
  async getKESToUSDRate() {
    try {
      const rate = await this.exchangeRateService.getKESToUSDRate();
      
      return {
        success: true,
        data: {
          from: 'KES',
          to: 'USD',
          rate,
          timestamp: new Date(),
        },
        message: `1 KES = ${rate} USD`,
      };
    } catch (error) {
      this.logger.error(`Failed to get KES to USD rate: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get KES to USD rate',
      };
    }
  }

  @Get('cache/stats')
  async getCacheStats() {
    try {
      const stats = this.exchangeRateService.getCacheStats();
      
      return {
        success: true,
        data: stats,
        message: 'Cache statistics retrieved',
      };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get cache statistics',
      };
    }
  }

  @Get('cache/clear')
  async clearCache() {
    try {
      this.exchangeRateService.clearCache();
      
      return {
        success: true,
        message: 'Cache cleared successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        message: 'Failed to clear cache',
      };
    }
  }
}

