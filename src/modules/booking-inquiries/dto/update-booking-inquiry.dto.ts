import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, IsEnum, IsString } from 'class-validator';
import { CreateBookingInquiryDto, ProposedPriceType } from './create-booking-inquiry.dto';

export enum InquiryStatus {
  PENDING = 'pending',
  PRICED = 'priced',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class UpdateBookingInquiryDto extends PartialType(CreateBookingInquiryDto) {
  @IsOptional()
  @IsEnum(InquiryStatus)
  inquiryStatus?: InquiryStatus;

  @IsOptional()
  @IsNumber()
  proposedPrice?: number;

  @IsOptional()
  @IsEnum(ProposedPriceType)
  proposedPriceType?: ProposedPriceType;

  @IsOptional()
  @IsString()
  adminNotes?: string;
} 