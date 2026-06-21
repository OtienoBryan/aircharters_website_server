import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateAmenityDto {
  @ApiProperty({ description: 'Amenity name', example: 'WiFi', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}
