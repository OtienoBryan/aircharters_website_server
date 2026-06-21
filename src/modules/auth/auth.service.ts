import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/common/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(registerDto: any) {
    try {
      const { email, password, firstName, lastName, phoneNumber, countryCode, authProvider } = registerDto;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        throw new BadRequestException('Missing required fields: email, password, firstName, lastName');
      }

      // Check if user already exists
      const existingUserConditions: any[] = [{ email }];
      
      // Check phone number if provided
      if (phoneNumber) {
        existingUserConditions.push({ phone_number: phoneNumber });
      }
      
      const existingUser = await this.userRepository.findOne({
        where: existingUserConditions
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ConflictException('User with this email already exists');
        } else if (existingUser.phone_number === phoneNumber) {
          throw new ConflictException('User with this phone number already exists');
        }
      }

      // Hash password for backend storage
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate backend user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const user = this.userRepository.create({
        id: userId,
        email,
        password: hashedPassword, // Store hashed password for backend auth
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null,
        country_code: countryCode || null,
        loyalty_points: 0,
        wallet_balance: 0,
        is_active: true,
        email_verified: false,
        phone_verified: false,
      });

      // Save user to database
      const savedUser = await this.userRepository.save(user);
      console.log('🔥 User saved to database:', savedUser.id);
      console.log('🔥 Password hashed and stored for backend authentication');

      // Generate backend JWT tokens
      const payload = {
        sub: savedUser.id,
        email: savedUser.email,
        phone: savedUser.phone_number,
        type: 'backend', // Indicate this is a backend token
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          phoneNumber: savedUser.phone_number,
          firstName: savedUser.first_name,
          lastName: savedUser.last_name,
          countryCode: savedUser.country_code,
          loyaltyPoints: savedUser.loyalty_points,
          walletBalance: savedUser.wallet_balance,
          isActive: savedUser.is_active,
          emailVerified: savedUser.email_verified,
          phoneVerified: savedUser.phone_verified,
          createdAt: savedUser.created_at,
          updatedAt: savedUser.updated_at,
        },
      };
    } catch (error) {
      console.error('🔥 Registration error:', error);
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Registration failed: ' + error.message);
    }
  }

  // Backend login with email/password
  async loginWithEmail(email: string, password: string) {
    try {
      console.log('🔥 Backend login attempt for:', email);
      
      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email }
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      console.log('🔥 Backend login successful for user:', user.id);

      // Generate backend JWT tokens
      const payload = {
        sub: user.id,
        email: user.email,
        phone: user.phone_number,
        type: 'backend',
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
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
        },
      };
    } catch (error) {
      console.error('🔥 Backend login error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed: ' + error.message);
    }
  }

  // Backend login with phone/password
  async loginWithPhone(phoneNumber: string, password: string) {
    try {
      console.log('🔥 Backend phone login attempt for:', phoneNumber);
      
      // Find user by phone number
      const user = await this.userRepository.findOne({
        where: { phone_number: phoneNumber }
      });

      if (!user) {
        throw new UnauthorizedException('Invalid phone number or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid phone number or password');
      }

      console.log('🔥 Backend phone login successful for user:', user.id);

      // Generate backend JWT tokens
      const payload = {
        sub: user.id,
        email: user.email,
        phone: user.phone_number,
        type: 'backend',
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
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
        },
      };
    } catch (error) {
      console.error('🔥 Backend phone login error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Phone login failed: ' + error.message);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        phone: payload.phone,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      return null;
    }
  }

  async getUserById(userId: string) {
    return await this.userRepository.findOne({
      where: { id: userId }
    });
  }

  // Biometric Authentication
  async loginWithBiometric(biometricId: string, userId: string, userEmail: string) {
    try {
      // Validate biometric authentication data
      if (!biometricId || !userId || !userEmail) {
        throw new UnauthorizedException('Invalid biometric authentication data');
      }

      // Find user by ID and email (double verification)
      const user = await this.userRepository.findOne({
        where: { 
          id: userId,
          email: userEmail 
        }
      });

      if (!user) {
        throw new UnauthorizedException('User not found or biometric data invalid');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Generate JWT tokens for biometric login
      const payload = {
        sub: user.id,
        email: user.email,
        phone: user.phone_number,
        type: 'biometric', // Indicate this is a biometric login
        biometricId: biometricId, // Store biometric ID in token for tracking
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

      console.log('🔥 Biometric login successful for user:', user.email);
      console.log('🔥 Biometric ID:', biometricId);

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 86400, // 24 hours in seconds
        user: {
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
        },
      };
    } catch (error) {
      console.error('🔥 Biometric login error:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        throw new UnauthorizedException('Biometric authentication failed');
      }
    }
  }
} 