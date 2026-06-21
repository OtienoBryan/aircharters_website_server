import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitConfig, RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

// In-memory store for rate limiting (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const config = this.getRateLimitConfig(context);

    if (!config) {
      return true; // No rate limit configured
    }

    const key = this.generateKey(request, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up expired entries
    this.cleanupExpiredEntries(windowStart);

    // Get or create rate limit entry
    let entry = requestCounts.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime: now + config.windowMs };
      requestCounts.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const resetTime = new Date(entry.resetTime);
      throw new HttpException(
        {
          message: config.message || 'Too many requests',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          resetTime: resetTime.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', config.maxRequests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    return true;
  }

  private getRateLimitConfig(context: ExecutionContext): RateLimitConfig | null {
    // Check for rate limit decorator
    const rateLimit = this.reflector.get<RateLimitConfig>(RATE_LIMIT_KEY, context.getHandler());
    if (rateLimit) {
      return rateLimit;
    }

    // Check for class-level rate limit
    const classRateLimit = this.reflector.get<RateLimitConfig>(RATE_LIMIT_KEY, context.getClass());
    if (classRateLimit) {
      return classRateLimit;
    }

    return null;
  }

  private generateKey(request: Request, config: RateLimitConfig): string {
    // Use IP address as the primary key
    const ip = this.getClientIp(request);
    
    // For authenticated users, you might want to use user ID instead
    const userId = (request as any).user?.sub;
    
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private cleanupExpiredEntries(windowStart: number): void {
    for (const [key, entry] of requestCounts.entries()) {
      if (entry.resetTime <= windowStart) {
        requestCounts.delete(key);
      }
    }
  }
}

