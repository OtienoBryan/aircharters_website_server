import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class GoogleEarthEngineLocationDto {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  types?: string[];
  rating?: number;
  userRatingsTotal?: number;
}

export class GoogleEarthEngineSearchDto {
  @IsNotEmpty()
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(2000000) // 2000km for international air travel
  radius?: number;
}

export class GoogleEarthEngineReverseGeocodeDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class GoogleEarthEngineDistanceDto {
  @IsNotEmpty()
  origin: {
    lat: number;
    lng: number;
  };

  @IsNotEmpty()
  destination: {
    lat: number;
    lng: number;
  };

  @IsOptional()
  @IsEnum(['driving', 'walking', 'bicycling', 'transit'])
  mode?: string;
} 