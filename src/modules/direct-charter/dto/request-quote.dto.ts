import { IsString, IsNotEmpty, IsDateString, IsInt, Min, Max, IsOptional, IsArray, ValidateNested, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * A waypoint on a quote request. Only the name (and optional order) is
 * required here. Coordinates are resolved server-side when the booking row
 * is created, unless the client already captured them via place selection.
 */
export class QuoteStopDto {
  @ApiProperty({ description: 'Name of the stop location' })
  @IsString()
  @IsNotEmpty()
  stopName: string;

  @ApiProperty({ description: 'Order of the stop in the journey', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  stopOrder?: number;

  @ApiProperty({ description: 'Stop latitude (from place selection)', required: false })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ description: 'Stop longitude (from place selection)', required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

/**
 * Payload for requesting a charter quote. This creates a `pending`
 * charter_bookings row (awaiting an operator quote) with no payment
 * taken and no passenger details required yet.
 */
export class RequestQuoteDto {
  @ApiProperty({ description: 'Aircraft ID' })
  @IsInt()
  @IsNotEmpty()
  aircraftId: number;

  @ApiProperty({ description: 'Origin airport / city' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ description: 'Destination airport / city' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  // Coordinates resolved on the client via Google Places autocomplete. When
  // present they are used directly; otherwise the server geocodes the names.
  @ApiProperty({ description: 'Origin latitude (from place selection)', required: false })
  @IsOptional()
  @IsLatitude()
  originLatitude?: number;

  @ApiProperty({ description: 'Origin longitude (from place selection)', required: false })
  @IsOptional()
  @IsLongitude()
  originLongitude?: number;

  @ApiProperty({ description: 'Destination latitude (from place selection)', required: false })
  @IsOptional()
  @IsLatitude()
  destinationLatitude?: number;

  @ApiProperty({ description: 'Destination longitude (from place selection)', required: false })
  @IsOptional()
  @IsLongitude()
  destinationLongitude?: number;

  @ApiProperty({ description: 'Departure date and time (ISO string)' })
  @IsDateString()
  @IsNotEmpty()
  departureDateTime: string;

  @ApiProperty({ description: 'Number of passengers' })
  @IsInt()
  @Min(1)
  @Max(50)
  passengerCount: number;

  @ApiProperty({ description: 'Special requests', required: false })
  @IsString()
  @IsOptional()
  specialRequests?: string;

  @ApiProperty({ description: 'Booking stops array', type: [QuoteStopDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteStopDto)
  stops?: QuoteStopDto[];
}
