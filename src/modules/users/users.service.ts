import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/common/entities/user.entity';
import { UserProfile, SeatPreference } from '@/common/entities/user-profile.entity';
import { WalletTransaction, WalletTransactionType, WalletTransactionStatus } from '@/common/entities/wallet-transaction.entity';
import { 
  UpdateUserProfileDto, 
  UpdateUserPreferencesDto, 
  ChangePasswordDto, 
  DeleteAccountDto, 
  PrivacySettingsDto 
} from './dto';
import { UserProfileService } from './services/user-profile.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    private readonly userProfileService: UserProfileService,
  ) {}

  async getUserById(userId: string): Promise<User | null> {
    return this.userProfileService.getUserById(userId);
  }

  async updateUserProfile(userId: string, updateProfileDto: UpdateUserProfileDto): Promise<User> {
    return this.userProfileService.updateUserProfile(userId, updateProfileDto);
  }

  async getUserPreferences(userId: string): Promise<any> {
    return this.userProfileService.getUserPreferences(userId);
  }

  async updateUserPreferences(userId: string, updatePreferencesDto: UpdateUserPreferencesDto): Promise<any> {
    return this.userProfileService.updateUserPreferences(userId, updatePreferencesDto);
  }

  async getUserWalletInfo(userId: string): Promise<any> {
    const user = await this.getUserById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get recent transactions
    const recentTransactions = await this.walletTransactionRepository.find({
      where: { userId: userId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      balance: user.wallet_balance,
      loyaltyPoints: user.loyalty_points,
      loyaltyTier: user.loyalty_tier,
      currency: user.currency || 'USD',
      lastTransaction: user.updated_at,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.transactionType,
        amount: tx.amount,
        pointsAmount: tx.pointsAmount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
      })),
    };
  }

  async createWalletTransaction(
    userId: string,
    transactionType: WalletTransactionType,
    amount: number,
    pointsAmount: number,
    description: string,
    bookingId?: string,
    metadata?: any,
  ): Promise<WalletTransaction> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transaction = this.walletTransactionRepository.create({
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      bookingId,
      transactionType,
      amount,
      pointsAmount,
      description,
      balanceBefore: user.wallet_balance,
      balanceAfter: user.wallet_balance + amount,
      pointsBefore: user.loyalty_points,
      pointsAfter: user.loyalty_points + pointsAmount,
      status: WalletTransactionStatus.COMPLETED,
      metadata,
      completedAt: new Date(),
    });

    // Update user balance and points
    user.wallet_balance = transaction.balanceAfter;
    user.loyalty_points = transaction.pointsAfter;
    await this.userRepository.save(user);

    return await this.walletTransactionRepository.save(transaction);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    await this.userRepository.save(user);
  }

  async deleteAccount(userId: string, deleteAccountDto: DeleteAccountDto): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(deleteAccountDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Soft delete - mark user as inactive and update deletion info
    user.is_active = false;
    user.deleted_at = new Date();
    user.deletion_reason = deleteAccountDto.reason || 'User requested deletion';
    
    await this.userRepository.save(user);

    // Note: In a production environment, you might want to:
    // 1. Delete related data (bookings, transactions, etc.)
    // 2. Send confirmation email
    // 3. Log the deletion for audit purposes
    // 4. Implement a grace period before permanent deletion
  }

  async exportUserData(userId: string): Promise<any> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user preferences
    const preferences = await this.getUserPreferences(userId);

    // Get user bookings (you'll need to implement this based on your booking entity)
    const bookings = []; // Placeholder - implement based on your booking service

    // Get user transactions
    const transactions = await this.walletTransactionRepository.find({
      where: { userId: userId },
      order: { createdAt: 'DESC' },
    });

    return {
      profile: {
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
      },
      preferences,
      bookings,
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.transactionType,
        amount: tx.amount,
        pointsAmount: tx.pointsAmount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      })),
      exportDate: new Date().toISOString(),
    };
  }

  async updatePrivacySettings(userId: string, privacySettingsDto: PrivacySettingsDto): Promise<any> {
    let profile = await this.userProfileRepository.findOne({
      where: { userId: userId },
    });

    if (!profile) {
      // Create new profile if none exists
      profile = this.userProfileRepository.create({
        userId: userId,
        seatPreference: SeatPreference.ANY,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        marketingEmails: true,
        profileVisible: false,
      });
    }

    // Update privacy settings
    if (privacySettingsDto.dataSharing !== undefined) {
      profile.dataSharing = privacySettingsDto.dataSharing;
    }
    if (privacySettingsDto.marketingEmails !== undefined) {
      profile.marketingEmails = privacySettingsDto.marketingEmails;
    }
    if (privacySettingsDto.smsNotifications !== undefined) {
      profile.smsNotifications = privacySettingsDto.smsNotifications;
    }
    if (privacySettingsDto.pushNotifications !== undefined) {
      profile.pushNotifications = privacySettingsDto.pushNotifications;
    }
    if (privacySettingsDto.profileVisible !== undefined) {
      profile.profileVisible = privacySettingsDto.profileVisible;
    }
    if (privacySettingsDto.locationTracking !== undefined) {
      profile.locationTracking = privacySettingsDto.locationTracking;
    }

    const savedProfile = await this.userProfileRepository.save(profile);

    return {
      dataSharing: savedProfile.dataSharing,
      marketingEmails: savedProfile.marketingEmails,
      smsNotifications: savedProfile.smsNotifications,
      pushNotifications: savedProfile.pushNotifications,
      profileVisible: savedProfile.profileVisible,
      locationTracking: savedProfile.locationTracking,
    };
  }

  async getPrivacySettings(userId: string): Promise<any> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId: userId },
    });

    if (!profile) {
      // Return default privacy settings if none exist
      return {
        dataSharing: false,
        marketingEmails: true,
        smsNotifications: true,
        pushNotifications: true,
        profileVisible: false,
        locationTracking: true,
      };
    }

    return {
      dataSharing: profile.dataSharing,
      marketingEmails: profile.marketingEmails,
      smsNotifications: profile.smsNotifications,
      pushNotifications: profile.pushNotifications,
      profileVisible: profile.profileVisible,
      locationTracking: profile.locationTracking,
    };
  }
} 