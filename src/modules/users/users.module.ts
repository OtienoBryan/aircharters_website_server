import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '@/common/entities/user.entity';
import { UserProfile } from '@/common/entities/user-profile.entity';
import { WalletTransaction } from '@/common/entities/wallet-transaction.entity';
import { UserProfileService } from './services/user-profile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, WalletTransaction]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserProfileService],
  exports: [UsersService],
})
export class UsersModule {} 