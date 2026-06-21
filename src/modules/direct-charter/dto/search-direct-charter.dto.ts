import { IsString, IsNotEmpty, IsDateString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchDirectCharterDto {
  @ApiProperty({ description: 'Origin airport code or city' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ description: 'Destination airport code or city' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ description: 'Departure date and time', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  departureDateTime: string;

  @ApiProperty({ description: 'Return date and time (optional for round trip)', example: '2024-01-20T18:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  returnDateTime?: string;

  @ApiProperty({ description: 'Number of passengers', minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  passengerCount: number;

  @ApiProperty({ description: 'Trip type', enum: ['oneway', 'roundtrip'], default: 'oneway' })
  @IsString()
  tripType: 'oneway' | 'roundtrip' = 'oneway';

  @ApiProperty({ description: 'Aircraft type image placeholder ID for filtering', required: false })
  @IsOptional()
  @IsInt()
  aircraftTypeImagePlaceholderId?: number;
} 