import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../common/entities/user.entity';
import { UserProfile, SeatPreference } from '../../../common/entities/user-profile.entity';
import { UpdateUserProfileDto, UpdateUserPreferencesDto } from '../dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, updateProfileDto: UpdateUserProfileDto): Promise<User> {
    const user = await this.getUserById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user fields if provided
    if (updateProfileDto.firstName !== undefined) {
      user.first_name = updateProfileDto.firstName;
    }
    if (updateProfileDto.lastName !== undefined) {
      user.last_name = updateProfileDto.lastName;
    }
    if (updateProfileDto.email !== undefined) {
      user.email = updateProfileDto.email;
    }
    if (updateProfileDto.phoneNumber !== undefined) {
      user.phone_number = updateProfileDto.phoneNumber;
    }
    if (updateProfileDto.countryCode !== undefined) {
      user.country_code = updateProfileDto.countryCode;
    }
    if (updateProfileDto.profileImageUrl !== undefined) {
      user.profile_image_url = updateProfileDto.profileImageUrl;
    }

    return await this.userRepository.save(user);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId: userId },
    });

    if (!profile) {
      // Return default preferences if none exist
      return {
        seatPreference: 'any',
        mealPreference: null,
        specialAssistance: null,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        marketingEmails: true,
        profileVisible: false,
      };
    }

    return {
      seatPreference: profile.seatPreference,
      mealPreference: profile.mealPreference,
      specialAssistance: profile.specialAssistance,
      emailNotifications: profile.emailNotifications,
      smsNotifications: profile.smsNotifications,
      pushNotifications: profile.pushNotifications,
      marketingEmails: profile.marketingEmails,
      profileVisible: profile.profileVisible,
    };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, updatePreferencesDto: UpdateUserPreferencesDto): Promise<any> {
    let profile = await this.userProfileRepository.findOne({
      where: { userId: userId },
    });

    if (!profile) {
      // Create new profile if none exist
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

    // Update profile if provided
    if (updatePreferencesDto.language !== undefined) {
      // Note: language is now in the main user table
      const user = await this.getUserById(userId);
      if (user) {
        user.language = updatePreferencesDto.language;
        await this.userRepository.save(user);
      }
    }
    if (updatePreferencesDto.currency !== undefined) {
      // Note: currency is now in the main user table
      const user = await this.getUserById(userId);
      if (user) {
        user.currency = updatePreferencesDto.currency;
        await this.userRepository.save(user);
      }
    }
    if (updatePreferencesDto.notifications !== undefined) {
      profile.emailNotifications = updatePreferencesDto.notifications;
      profile.smsNotifications = updatePreferencesDto.notifications;
      profile.pushNotifications = updatePreferencesDto.notifications;
    }
    if (updatePreferencesDto.dateOfBirth !== undefined) {
      // Note: dateOfBirth is now in the main user table
      const user = await this.getUserById(userId);
      if (user) {
        user.date_of_birth = new Date(updatePreferencesDto.dateOfBirth);
        await this.userRepository.save(user);
      }
    }
    if (updatePreferencesDto.nationality !== undefined) {
      // Note: nationality is now in the main user table
      const user = await this.getUserById(userId);
      if (user) {
        user.nationality = updatePreferencesDto.nationality;
        await this.userRepository.save(user);
      }
    }

    await this.userProfileRepository.save(profile);

    return {
      seatPreference: profile.seatPreference,
      mealPreference: profile.mealPreference,
      specialAssistance: profile.specialAssistance,
      emailNotifications: profile.emailNotifications,
      smsNotifications: profile.smsNotifications,
      pushNotifications: profile.pushNotifications,
      marketingEmails: profile.marketingEmails,
      profileVisible: profile.profileVisible,
    };
  }

  /**
   * Create or update user profile
   */
  async createOrUpdateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    let profile = await this.userProfileRepository.findOne({
      where: { userId: userId },
    });

    if (!profile) {
      profile = this.userProfileRepository.create({
        userId: userId,
        ...profileData,
      });
    } else {
      Object.assign(profile, profileData);
    }

    return await this.userProfileRepository.save(profile);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return await this.userProfileRepository.findOne({
      where: { userId: userId },
    });
  }

  /**
   * Delete user profile
   */
  async deleteUserProfile(userId: string): Promise<void> {
    await this.userProfileRepository.delete({ userId: userId });
  }
} 