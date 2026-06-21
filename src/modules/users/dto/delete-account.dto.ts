import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'User password for confirmation',
    example: 'userPassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Reason for account deletion (optional)',
    example: 'No longer using the service',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
} 