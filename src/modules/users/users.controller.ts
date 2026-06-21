import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { 
  UpdateUserProfileDto, 
  UpdateUserPreferencesDto, 
  ChangePasswordDto, 
  DeleteAccountDto, 
  PrivacySettingsDto 
} from './dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        phoneNumber: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        countryCode: { type: 'string' },
        profileImageUrl: { type: 'string' },
        loyaltyPoints: { type: 'number' },
        walletBalance: { type: 'number' },
        isActive: { type: 'boolean' },
        emailVerified: { type: 'boolean' },
        phoneVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        preferences: {
          type: 'object',
          properties: {
            language: { type: 'string' },
            currency: { type: 'string' },
            notifications: { type: 'boolean' },
            dateOfBirth: { type: 'string', format: 'date' },
            nationality: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const userId = req.user.sub;
    const user = await this.usersService.getUserById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user preferences
    const preferences = await this.usersService.getUserPreferences(userId);

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phone_number,
      firstName: user.first_name,
      lastName: user.last_name,
      countryCode: user.country_code,
      profileImageUrl: user.profile_image_url,
      loyaltyPoints: user.loyalty_points,
      walletBalance: user.wallet_balance,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      preferences,
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            countryCode: { type: 'string' },
            profileImageUrl: { type: 'string' },
            loyaltyPoints: { type: 'number' },
            walletBalance: { type: 'number' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid profile data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateUserProfileDto) {
    const userId = req.user.sub;
    
    try {
      const updatedUser = await this.usersService.updateUserProfile(userId, updateProfileDto);
      
      return {
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          phoneNumber: updatedUser.phone_number,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          countryCode: updatedUser.country_code,
          profileImageUrl: updatedUser.profile_image_url,
          loyaltyPoints: updatedUser.loyalty_points,
          walletBalance: updatedUser.wallet_balance,
          isActive: updatedUser.is_active,
          emailVerified: updatedUser.email_verified,
          phoneVerified: updatedUser.phone_verified,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        preferences: {
          type: 'object',
          properties: {
            language: { type: 'string' },
            currency: { type: 'string' },
            notifications: { type: 'boolean' },
            dateOfBirth: { type: 'string', format: 'date' },
            nationality: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid preferences data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(@Request() req, @Body() updatePreferencesDto: UpdateUserPreferencesDto) {
    const userId = req.user.sub;
    
    try {
      const updatedPreferences = await this.usersService.updateUserPreferences(userId, updatePreferencesDto);
      
      return {
        message: 'Preferences updated successfully',
        preferences: updatedPreferences,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update preferences: ${error.message}`);
    }
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user wallet information' })
  @ApiResponse({
    status: 200,
    description: 'Wallet information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: { type: 'number' },
        loyaltyPoints: { type: 'number' },
        currency: { type: 'string' },
        lastTransaction: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWalletInfo(@Request() req) {
    const userId = req.user.sub;
    const user = await this.usersService.getUserById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      balance: user.wallet_balance,
      loyaltyPoints: user.loyalty_points,
      currency: 'USD', // Default currency
      lastTransaction: user.updated_at,
    };
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid password data' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid current password' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user.sub;
    
    try {
      await this.usersService.changePassword(userId, changePasswordDto);
      
      return {
        message: 'Password changed successfully',
      };
    } catch (error) {
      if (error.message === 'Invalid current password') {
        throw new UnauthorizedException('Invalid current password');
      }
      throw new BadRequestException(`Failed to change password: ${error.message}`);
    }
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid password' })
  async deleteAccount(@Request() req, @Body() deleteAccountDto: DeleteAccountDto) {
    const userId = req.user.sub;
    
    try {
      await this.usersService.deleteAccount(userId, deleteAccountDto);
      
      return {
        message: 'Account deleted successfully',
      };
    } catch (error) {
      if (error.message === 'Invalid password') {
        throw new UnauthorizedException('Invalid password');
      }
      throw new BadRequestException(`Failed to delete account: ${error.message}`);
    }
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export user data' })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
    schema: {
      type: 'object',
      properties: {
        userData: {
          type: 'object',
          properties: {
            profile: { type: 'object' },
            preferences: { type: 'object' },
            bookings: { type: 'array' },
            transactions: { type: 'array' },
            exportDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportUserData(@Request() req) {
    const userId = req.user.sub;
    
    try {
      const userData = await this.usersService.exportUserData(userId);
      
      return {
        userData,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to export user data: ${error.message}`);
    }
  }

  @Put('privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update privacy settings' })
  @ApiResponse({
    status: 200,
    description: 'Privacy settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        privacySettings: {
          type: 'object',
          properties: {
            dataSharing: { type: 'boolean' },
            marketingEmails: { type: 'boolean' },
            smsNotifications: { type: 'boolean' },
            pushNotifications: { type: 'boolean' },
            profileVisible: { type: 'boolean' },
            locationTracking: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid privacy settings data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePrivacySettings(@Request() req, @Body() privacySettingsDto: PrivacySettingsDto) {
    const userId = req.user.sub;
    
    try {
      const updatedSettings = await this.usersService.updatePrivacySettings(userId, privacySettingsDto);
      
      return {
        message: 'Privacy settings updated successfully',
        privacySettings: updatedSettings,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update privacy settings: ${error.message}`);
    }
  }

  @Get('privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get privacy settings' })
  @ApiResponse({
    status: 200,
    description: 'Privacy settings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        privacySettings: {
          type: 'object',
          properties: {
            dataSharing: { type: 'boolean' },
            marketingEmails: { type: 'boolean' },
            smsNotifications: { type: 'boolean' },
            pushNotifications: { type: 'boolean' },
            profileVisible: { type: 'boolean' },
            locationTracking: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPrivacySettings(@Request() req) {
    const userId = req.user.sub;
    
    try {
      const privacySettings = await this.usersService.getPrivacySettings(userId);
      
      return {
        privacySettings,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get privacy settings: ${error.message}`);
    }
  }
} 