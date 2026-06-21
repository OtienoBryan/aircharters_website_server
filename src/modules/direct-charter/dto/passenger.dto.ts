import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PassengerDto {
  @ApiProperty({ description: 'Passenger first name' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value != null ? String(value) : value))
  firstName: string;

  @ApiProperty({ description: 'Passenger last name' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value != null ? String(value) : value))
  lastName: string;

  @ApiProperty({ description: 'Passenger age' })
  @IsInt()
  @Min(0)
  @Max(150)
  @Transform(({ value }) => {
    if (value == null) return value;
    if (typeof value === 'number') return value;
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? value : parsed;
  })
  age: number;

  @ApiProperty({ description: 'Passenger nationality' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value != null ? String(value) : value))
  nationality: string;

  @ApiProperty({ description: 'Passport or ID number', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value != null ? String(value) : value))
  idPassportNumber?: string;

  @ApiProperty({ description: 'Whether this passenger is the booking user', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isUser?: boolean;
}
