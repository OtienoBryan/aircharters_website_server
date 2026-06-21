import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../../common/entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Booking ID for the payment' })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used' })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Total amount to be paid', minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ description: 'Platform fee amount', minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  platformFee: number;

  @ApiProperty({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Transaction ID from payment gateway', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ description: 'Payment gateway response data', required: false })
  @IsOptional()
  paymentGatewayResponse?: any;
} 