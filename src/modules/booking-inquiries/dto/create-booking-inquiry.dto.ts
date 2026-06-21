import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProposedPriceType {
  PER_SEAT = 'per_seat',
  PER_HOUR = 'per_hour',
  TOTAL = 'total',
}

export class InquiryStopDto {
  @IsString()
  stopName: string;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

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
  stopOrder?: number;

  @IsOptional()
  @IsString()
  locationCode?: string;
}

export class CreateBookingInquiryDto {
  @IsNumber()
  aircraftId: number;

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

  @IsOptional()
  @IsString()
  preferredDepartureDate?: string;

  @IsOptional()
  @IsString()
  preferredReturnDate?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;
} 