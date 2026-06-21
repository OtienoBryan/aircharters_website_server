import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, Length } from 'class-validator';

export class CreatePassengerDto {
  @ApiProperty({
    description: 'Booking ID this passenger belongs to',
    example: 'booking_1752533042834_nsyj4iqyf',
  })
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: 'Passenger first name',
    example: 'John',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100)
  firstName: string;

  @ApiProperty({
    description: 'Passenger last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100)
  lastName: string;

  @ApiProperty({
    description: 'Passenger age',
    example: 25,
    minimum: 0,
    maximum: 120,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @ApiProperty({
    description: 'Passenger nationality',
    example: 'United States',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nationality?: string;

  @ApiProperty({
    description: 'ID or Passport number',
    example: 'A12345678',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  idPassportNumber?: string;
} 