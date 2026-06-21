import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateAmenityDto {
  @ApiProperty({ description: 'Amenity name', example: 'WiFi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
