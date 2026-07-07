import { IsString, IsNotEmpty, IsDateString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for requesting a quote on an experience without picking one of its
 * pre-priced scheduled slots. This creates a `pending` charter_bookings row
 * (awaiting an operator quote) with no schedule attached and no payment taken.
 */
export class RequestExperienceQuoteDto {
  @ApiProperty({ description: 'Experience template ID' })
  @IsInt()
  @IsNotEmpty()
  experienceTemplateId: number;

  @ApiProperty({ description: 'Preferred date and time (ISO string)' })
  @IsDateString()
  @IsNotEmpty()
  preferredDateTime: string;

  @ApiProperty({ description: 'Number of passengers' })
  @IsInt()
  @Min(1)
  @Max(50)
  passengerCount: number;

  @ApiProperty({ description: 'Special requests', required: false })
  @IsString()
  @IsOptional()
  specialRequests?: string;
}
