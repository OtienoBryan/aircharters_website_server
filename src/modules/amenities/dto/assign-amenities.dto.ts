import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsNotEmpty } from 'class-validator';

export class AssignAmenitiesDto {
  @ApiProperty({ description: 'Array of amenity IDs to assign', example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  amenityIds: number[];
}
