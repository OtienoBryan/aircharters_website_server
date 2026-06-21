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
