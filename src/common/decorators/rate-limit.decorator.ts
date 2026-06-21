import { SetMetadata } from '@nestjs/common';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_KEY, config);

// Predefined rate limit configurations
export const RateLimitConfigs = {
  // Strict rate limiting for auth endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },

  // Moderate rate limiting for booking endpoints
  BOOKING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Too many booking requests. Please slow down.',
  },

  // Lenient rate limiting for general API endpoints
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.',
  },

  // Very strict rate limiting for payment endpoints
  PAYMENT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 payment attempts per minute
    message: 'Too many payment attempts. Please try again later.',
  },

  // Rate limiting for search endpoints
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    message: 'Too many search requests. Please slow down.',
  },
};
