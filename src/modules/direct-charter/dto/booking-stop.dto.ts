import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum LocationType {
  AIRPORT = 'airport',
  CITY = 'city',
  CUSTOM = 'custom',
}

export class BookingStopDto {
  @ApiProperty({ description: 'Name of the stop location' })
  @IsString()
  @IsNotEmpty()
  stopName: string;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Stop datetime', required: false })
  @IsOptional()
  @IsString()
  datetime?: string;

  @ApiProperty({ description: 'Order of the stop in the journey', default: 1 })
  @IsInt()
  @Min(1)
  stopOrder: number;

  @ApiProperty({ description: 'Type of location', enum: LocationType, default: LocationType.CUSTOM })
  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

  @ApiProperty({ description: 'Location code (e.g., airport code)', required: false })
  @IsOptional()
  @IsString()
  locationCode?: string;
}


