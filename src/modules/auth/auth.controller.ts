import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RefreshTokenDto, UpdateProfileDto } from './dto';
import { RateLimit, RateLimitConfigs } from '@/common/decorators/rate-limit.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(RateLimitConfigs.AUTH)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string' },
        expiresIn: { type: 'number' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            countryCode: { type: 'string' },
            loyaltyPoints: { type: 'number' },
            walletBalance: { type: 'number' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: any) {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RateLimitConfigs.AUTH)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string' },
        expiresIn: { type: 'number' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            countryCode: { type: 'string' },
            loyaltyPoints: { type: 'number' },
            walletBalance: { type: 'number' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: { email: string; password: string }) {
    return await this.authService.loginWithEmail(loginDto.email, loginDto.password);
  }

  @Post('login/phone')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RateLimitConfigs.AUTH)
  @ApiOperation({ summary: 'Login with phone number and password' })
  @ApiResponse({
    status: 200,
    description: 'Phone login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string' },
        expiresIn: { type: 'number' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            countryCode: { type: 'string' },
            loyaltyPoints: { type: 'number' },
            walletBalance: { type: 'number' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid phone number or password' })
  async loginWithPhone(@Body() phoneLoginDto: { phoneNumber: string; password: string }) {
    return await this.authService.loginWithPhone(phoneLoginDto.phoneNumber, phoneLoginDto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const user = await this.authService.getUserById(req.user.sub);
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phone_number,
      firstName: user.first_name,
      lastName: user.last_name,
      countryCode: user.country_code,
      loyaltyPoints: user.loyalty_points,
      walletBalance: user.wallet_balance,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    // This would need to be implemented in the auth service
    // For now, return a placeholder response
    return {
      message: 'Profile update endpoint - implementation needed',
      userId: req.user.sub,
      updateData: updateProfileDto,
    };
  }

  @Post('login/biometric')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RateLimitConfigs.AUTH)
  @ApiOperation({ summary: 'Login with biometric authentication' })
  @ApiResponse({
    status: 200,
    description: 'Biometric login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string' },
        expiresIn: { type: 'number' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            countryCode: { type: 'string' },
            loyaltyPoints: { type: 'number' },
            walletBalance: { type: 'number' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid biometric authentication' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async loginWithBiometric(@Body() biometricDto: { biometricId: string; userId: string; userEmail: string }) {
    return await this.authService.loginWithBiometric(biometricDto.biometricId, biometricDto.userId, biometricDto.userEmail);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req) {
    // In a real implementation, you might want to blacklist the token
    // For now, just return a success response
    return {
      message: 'Logout successful',
      userId: req.user.sub,
    };
  }
} 