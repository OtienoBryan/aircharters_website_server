import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class PrivacySettingsDto {
  @ApiProperty({
    description: 'Allow data sharing with third parties',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  dataSharing?: boolean;

  @ApiProperty({
    description: 'Receive marketing emails',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiProperty({
    description: 'Receive SMS notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiProperty({
    description: 'Receive push notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiProperty({
    description: 'Profile visibility to other users',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  profileVisible?: boolean;

  @ApiProperty({
    description: 'Allow location tracking',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  locationTracking?: boolean;
} 