import { IsString, IsNotEmpty, IsDateString, IsInt, Min, Max, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PassengerDto } from './passenger.dto';
import { BookingStopDto } from './booking-stop.dto';

export class BookDirectCharterDto {
  @ApiProperty({ description: 'Aircraft ID' })
  @IsInt()
  @IsNotEmpty()
  aircraftId: number;

  @ApiProperty({ description: 'Origin airport' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ description: 'Destination airport' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ description: 'Departure date and time' })
  @IsDateString()
  @IsNotEmpty()
  departureDateTime: string;

  @ApiProperty({ description: 'Return date and time (for round trips)', required: false })
  @IsDateString()
  @IsOptional()
  returnDateTime?: string;

  @ApiProperty({ description: 'Number of passengers' })
  @IsInt()
  @Min(1)
  @Max(50)
  passengerCount: number;

  @ApiProperty({ description: 'Total price' })
  @IsNumber()
  @IsNotEmpty()
  totalPrice: number;

  @ApiProperty({ description: 'Price per hour' })
  @IsNumber()
  @IsNotEmpty()
  pricePerHour: number;

  @ApiProperty({ description: 'Repositioning cost', required: false })
  @IsNumber()
  @IsOptional()
  repositioningCost?: number;

  @ApiProperty({ description: 'Trip type', enum: ['oneway', 'roundtrip'] })
  @IsString()
  tripType: 'oneway' | 'roundtrip';

  @ApiProperty({ description: 'Special requests', required: false })
  @IsString()
  @IsOptional()
  specialRequests?: string;

  @ApiProperty({ description: 'Passenger details array', type: [PassengerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiProperty({ description: 'Booking stops array (origin, intermediate stops, destination)', type: [BookingStopDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingStopDto)
  stops?: BookingStopDto[];
} 