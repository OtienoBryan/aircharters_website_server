import { ApiProperty } from '@nestjs/swagger';

export class ExperienceImageDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  imageSlot: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  sortOrder: number;
}

export class ExperienceDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  city: string;

  @ApiProperty({ required: false })
  locationName?: string;

  @ApiProperty({ required: false })
  taxType?: string;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  subTotal: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  termsConditions: string;

  @ApiProperty({ type: [ExperienceImageDto] })
  images: ExperienceImageDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ExperienceCardDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  location: string;

  @ApiProperty()
  duration: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  rating: string;

  @ApiProperty({ required: false, description: 'Seats remaining on the next scheduled departure' })
  seatsAvailable?: number;

  @ApiProperty({ required: false, description: 'Start time of the next scheduled departure' })
  startTime?: Date;

  @ApiProperty({ required: false, enum: ['per_person', 'per_group', 'per_hour', 'per_flight'] })
  priceUnit?: string;

  @ApiProperty({ required: false, description: 'Total number of scheduled tours for this experience' })
  scheduledToursCount?: number;
}

export class ExperienceScheduleDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  experienceId: number;

  @ApiProperty({ required: false, nullable: true })
  aircraftId?: number;

  @ApiProperty({ required: false, nullable: true })
  aircraftName?: string;

  @ApiProperty({ required: false, nullable: true })
  aircraftImageUrl?: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty({ required: false, nullable: true })
  endTime?: Date;

  @ApiProperty({ enum: ['per_person', 'per_group', 'per_hour', 'per_flight'] })
  priceUnit: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  seatsAvailable: number;

  @ApiProperty({ enum: ['scheduled', 'cancelled', 'completed'] })
  status: string;

  @ApiProperty({ required: false, nullable: true })
  taxType?: string;

  @ApiProperty()
  subTotal: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ required: false })
  taxAmount?: number;
}

export class ExperienceCategoryDto {
  @ApiProperty()
  title: string;

  @ApiProperty({ type: [ExperienceCardDto] })
  deals: ExperienceCardDto[];
}

export class ExperiencesResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [ExperienceCategoryDto] })
  data: {
    categories: ExperienceCategoryDto[];
  };
}

export class ExperienceDetailResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: ExperienceDetailDto })
  data: ExperienceDetailDto;
}
