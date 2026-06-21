import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import { PaymentMethod } from '../../../common/entities/booking.entity'; // Not in database

export class PassengerDataDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idPassportNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUser?: boolean;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsNumber()
  dealId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  experienceScheduleId?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onboardDining?: boolean;

  // Removed groundTransportation - not in database schema

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingRegion?: string;

  // @ApiPropertyOptional()
  // @IsOptional()
  // @IsEnum(PaymentMethod)
  // paymentMethod?: PaymentMethod; // Not in database

  @ApiPropertyOptional({ 
    type: [PassengerDataDto],
    description: 'Additional passengers (the booking user will be automatically added as the first passenger if not already included)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDataDto)
  passengers?: PassengerDataDto[];
  experienceTemplateId: any;
} 