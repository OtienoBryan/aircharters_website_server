import { IsOptional, IsNumber, IsString, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCharterDealsDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search query for company, route, or aircraft' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by deal type', enum: ['privateCharter', 'jetSharing'] })
  @IsOptional()
  @IsEnum(['privateCharter', 'jetSharing'])
  dealType?: string;

  @ApiPropertyOptional({ description: 'Filter deals from this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter deals to this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Filter by aircraft type image placeholder ID' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  aircraftTypeImagePlaceholderId?: number;

  @ApiPropertyOptional({ description: 'Filter by route origin' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ description: 'Filter by route destination' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: 'User latitude for proximity sorting' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  userLat?: number;

  @ApiPropertyOptional({ description: 'User longitude for proximity sorting' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  userLng?: number;

  @ApiPropertyOptional({ description: 'Group by aircraft type and route', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  groupBy?: boolean = false;
}
