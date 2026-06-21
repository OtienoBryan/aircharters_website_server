import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { InquiryStatus, ProposedPriceType } from '../../../common/entities/booking-inquiry.entity';

export class InquiryStopDto {
  @IsNotEmpty()
  @IsString()
  stopName: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  datetime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  stopOrder?: number;

  @IsOptional()
  @IsString()
  locationCode?: string;
}

export class CreateBookingInquiryDto {
  @IsNotEmpty()
  @IsNumber()
  aircraftId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  requestedSeats: number;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsBoolean()
  onboardDining?: boolean;

  @IsOptional()
  @IsBoolean()
  groundTransportation?: boolean;

  @IsOptional()
  @IsString()
  billingRegion?: string;

  @IsOptional()
  @IsString()
  userNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InquiryStopDto)
  stops: InquiryStopDto[];
} 