import { IsOptional, IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LocationType } from '../../../common/entities/location.entity';

export class SearchLocationsDto {
  @ApiProperty({
    description: 'Search query for location name, code, or country',
    required: false,
    example: 'Nairobi',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q?: string;

  @ApiProperty({
    description: 'Filter by location type',
    enum: LocationType,
    required: false,
    example: LocationType.AIRPORT,
  })
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @ApiProperty({
    description: 'Filter by country',
    required: false,
    example: 'Kenya',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country?: string;

  @ApiProperty({
    description: 'Limit number of results',
    required: false,
    example: 20,
  })
  @IsOptional()
  limit?: number = 20;
} 