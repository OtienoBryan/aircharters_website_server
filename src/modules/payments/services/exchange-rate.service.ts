import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Currency } from '../../../common/entities/transaction-ledger.entity';

export interface ExchangeRateResponse {
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface CurrencyConversionRequest {
  amount: number;
  from: Currency;
  to: Currency;
}

export interface CurrencyConversionResponse {
  originalAmount: number;
  convertedAmount: number;
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: Date;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly cache = new Map<string, { rate: number; timestamp: Date }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // ExchangeRatesAPI.io configuration
  private readonly API_ENDPOINT = {
    name: 'exchangeratesapi.io',
    url: 'https://api.exchangeratesapi.io/v1/latest',
    apiKey: process.env.EXCHANGE_RATES_API_KEY,
    format: (data: any, from: Currency, to: Currency) => {
      const rates = data.rates;
      // Convert via EUR (base currency)
      const fromRate = rates[from] || 1; // Rate from EUR to 'from' currency
      const toRate = rates[to] || 1;     // Rate from EUR to 'to' currency
      
      // Convert from 'from' currency to 'to' currency via EUR
      // If 1 EUR = fromRate * 'from' currency, and 1 EUR = toRate * 'to' currency
      // Then 1 'from' currency = toRate / fromRate * 'to' currency
      return toRate / fromRate;
    }
  };

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(from: Currency, to: Currency): Promise<ExchangeRateResponse> {
    if (from === to) {
      return {
        from,
        to,
        rate: 1.0,
        timestamp: new Date(),
        source: 'same_currency'
      };
    }

    const cacheKey = `${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_DURATION) {
      this.logger.log(`Using cached exchange rate: ${from} to ${to} = ${cached.rate}`);
      return {
        from,
        to,
        rate: cached.rate,
        timestamp: cached.timestamp,
        source: 'cache'
      };
    }

    // Try ExchangeRatesAPI.io
    if (!this.API_ENDPOINT.apiKey) {
      this.logger.warn(`No API key configured for ${this.API_ENDPOINT.name}`);
    } else {
      try {
        const rate = await this.fetchFromAPI(this.API_ENDPOINT, from, to);
        if (rate !== null) {
          // Cache the result
          this.cache.set(cacheKey, { rate, timestamp: new Date() });
          
          this.logger.log(`Exchange rate fetched from ${this.API_ENDPOINT.name}: ${from} to ${to} = ${rate}`);
          return {
            from,
            to,
            rate,
            timestamp: new Date(),
            source: this.API_ENDPOINT.name
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch from ${this.API_ENDPOINT.name}: ${error.message}`);
      }
    }

    // Fallback to hardcoded rates if API fails
    this.logger.warn('ExchangeRatesAPI.io failed, using fallback rates');
    const fallbackRate = this.getFallbackRate(from, to);
    
    return {
      from,
      to,
      rate: fallbackRate,
      timestamp: new Date(),
      source: 'fallback'
    };
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(request: CurrencyConversionRequest): Promise<CurrencyConversionResponse> {
    const exchangeRate = await this.getExchangeRate(request.from, request.to);
    
    return {
      originalAmount: request.amount,
      convertedAmount: request.amount * exchangeRate.rate,
      from: request.from,
      to: request.to,
      rate: exchangeRate.rate,
      timestamp: exchangeRate.timestamp
    };
  }

  /**
   * Get USD to KES rate (most common conversion)
   */
  async getUSDToKESRate(): Promise<number> {
    const response = await this.getExchangeRate(Currency.USD, Currency.KES);
    return response.rate;
  }

  /**
   * Get KES to USD rate
   */
  async getKESToUSDRate(): Promise<number> {
    const response = await this.getExchangeRate(Currency.KES, Currency.USD);
    return response.rate;
  }

  private async fetchFromAPI(endpoint: any, from: Currency, to: Currency): Promise<number | null> {
    try {
      // Use EUR as base currency (free plan limitation)
      const url = `${endpoint.url}?access_key=${endpoint.apiKey}&base=EUR&symbols=${from},${to}`;
      const response = await firstValueFrom(this.httpService.get(url));
      
      if (response.data.success === false) {
        throw new Error(response.data.error?.info || 'API returned error');
      }

      return endpoint.format(response.data, from, to);
    } catch (error) {
      this.logger.error(`Error fetching from ${endpoint.name}: ${error.message}`);
      return null;
    }
  }

  private getFallbackRate(from: Currency, to: Currency): number {
    // Fallback rates (updated periodically)
    const fallbackRates = {
      [`${Currency.USD}_${Currency.KES}`]: 129.0, // 1 USD = 129 KES
      [`${Currency.KES}_${Currency.USD}`]: 0.0077, // 1 KES = 0.0077 USD
      [`${Currency.USD}_${Currency.EUR}`]: 0.92, // 1 USD = 0.92 EUR
      [`${Currency.EUR}_${Currency.USD}`]: 1.09, // 1 EUR = 1.09 USD
      [`${Currency.USD}_${Currency.GBP}`]: 0.79, // 1 USD = 0.79 GBP
      [`${Currency.GBP}_${Currency.USD}`]: 1.27, // 1 GBP = 1.27 USD
    };

    const key = `${from}_${to}`;
    const rate = fallbackRates[key];
    
    if (rate) {
      this.logger.warn(`Using fallback rate for ${key}: ${rate}`);
      return rate;
    }

    // If no fallback rate, return 1 (should not happen in production)
    this.logger.error(`No fallback rate found for ${key}, returning 1.0`);
    return 1.0;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Exchange rate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
