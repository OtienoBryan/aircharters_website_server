import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus } from '../../../common/entities/booking.entity';

export class BookingStatusResponseDto {
  @ApiProperty({ description: 'Booking reference number' })
  referenceNumber: string;

  @ApiProperty({ description: 'Booking status', enum: BookingStatus })
  bookingStatus: BookingStatus;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'Flight date' })
  flightDate: string;

  @ApiProperty({ description: 'Flight time' })
  flightTime: string;

  @ApiProperty({ description: 'Origin airport/city' })
  origin: string;

  @ApiProperty({ description: 'Destination airport/city' })
  destination: string;

  @ApiProperty({ description: 'Aircraft name' })
  aircraftName: string;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'Total price' })
  totalPrice: string;

  @ApiProperty({ description: 'Number of passengers' })
  passengerCount: number;

  @ApiProperty({ description: 'Booking creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;
} 