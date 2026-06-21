import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsOptional, IsBoolean, Min, IsPositive, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AircraftAvailabilitySearchDto {
  @ApiProperty({ description: 'Departure location ID' })
  @IsNumber()
  @IsPositive()
  departureLocationId: number;

  @ApiProperty({ description: 'Arrival location ID' })
  @IsNumber()
  @IsPositive()
  arrivalLocationId: number;

  @ApiProperty({ description: 'Departure date' })
  @IsDateString()
  departureDate: string;

  @ApiProperty({ description: 'Return date (optional for round trips)', required: false })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty({ description: 'Number of passengers' })
  @IsNumber()
  @Min(1)
  passengerCount: number;

  @ApiProperty({ description: 'Is round trip', required: false })
  @IsOptional()
  @IsBoolean()
  isRoundTrip?: boolean;
}

export class AvailableAircraftDto {
  @ApiProperty({ description: 'Aircraft ID' })
  aircraftId: number;

  @ApiProperty({ description: 'Aircraft name' })
  aircraftName: string;

  @ApiProperty({ description: 'Aircraft type' })
  aircraftType: string;

  @ApiProperty({ description: 'Aircraft capacity' })
  capacity: number;

  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'Base price' })
  basePrice: number;

  @ApiProperty({ description: 'Repositioning cost', required: false })
  repositioningCost?: number;

  @ApiProperty({ description: 'Total price' })
  totalPrice: number;

  @ApiProperty({ description: 'Available seats' })
  availableSeats: number;

  @ApiProperty({ description: 'Departure time' })
  departureTime: string;

  @ApiProperty({ description: 'Arrival time' })
  arrivalTime: string;

  @ApiProperty({ description: 'Flight duration in minutes' })
  flightDuration: number;

  @ApiProperty({ description: 'Distance in km' })
  distance: number;

  @ApiProperty({ description: 'Amenities', type: [String] })
  amenities: string[];

  @ApiProperty({ description: 'Aircraft images', type: [String] })
  images: string[];
} 