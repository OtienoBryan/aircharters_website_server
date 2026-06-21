import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description: 'User preferred language',
    required: false,
    example: 'English',
    enum: ['English', 'Spanish', 'French', 'German'],
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'User preferred currency',
    required: false,
    example: 'USD ($)',
    enum: ['USD ($)', 'EUR (€)', 'GBP (£)', 'JPY (¥)'],
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'User preferred theme',
    required: false,
    example: 'light',
    enum: ['light', 'dark', 'system'],
  })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiProperty({
    description: 'User notification preferences',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @ApiProperty({
    description: 'User date of birth',
    required: false,
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'User nationality',
    required: false,
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  nationality?: string;
} 