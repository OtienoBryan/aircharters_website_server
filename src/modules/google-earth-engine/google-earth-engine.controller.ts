import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { GoogleEarthEngineService } from './google-earth-engine.service';
import { GoogleEarthEngineSearchDto, GoogleEarthEngineReverseGeocodeDto, GoogleEarthEngineDistanceDto } from './dto/google-earth-engine.dto';

@Controller('google-earth-engine')
export class GoogleEarthEngineController {
  constructor(private readonly googleEarthEngineService: GoogleEarthEngineService) {}

  @Get('search/locations')
  async searchLocations(@Query() searchDto: GoogleEarthEngineSearchDto) {
    return this.googleEarthEngineService.searchLocations(searchDto);
  }

  @Post('search')
  async searchLocationsPost(@Body() searchDto: GoogleEarthEngineSearchDto) {
    return this.googleEarthEngineService.searchLocations(searchDto);
  }

  @Get('geocode/reverse')
  async reverseGeocode(@Query() reverseGeocodeDto: GoogleEarthEngineReverseGeocodeDto) {
    return this.googleEarthEngineService.reverseGeocode(reverseGeocodeDto);
  }

  @Post('reverse-geocode')
  async reverseGeocodePost(@Body() reverseGeocodeDto: GoogleEarthEngineReverseGeocodeDto) {
    return this.googleEarthEngineService.reverseGeocode(reverseGeocodeDto);
  }

  @Get('distance/calculate')
  async calculateDistance(@Query() distanceDto: GoogleEarthEngineDistanceDto) {
    return this.googleEarthEngineService.calculateDistance(distanceDto);
  }

  @Post('distance')
  async calculateDistancePost(@Body() distanceDto: GoogleEarthEngineDistanceDto) {
    return this.googleEarthEngineService.calculateDistance(distanceDto);
  }

  @Get('place/:placeId')
  async getPlaceDetails(@Query('placeId') placeId: string) {
    return this.googleEarthEngineService.getPlaceDetails(placeId);
  }

  @Get('distance/flight')
  async calculateFlightDistance(
    @Query('lat1') lat1: number,
    @Query('lon1') lon1: number,
    @Query('lat2') lat2: number,
    @Query('lon2') lon2: number,
    @Query('aircraftType') aircraftType: string = 'jet',
  ) {
    const distance = this.googleEarthEngineService.calculateFlightDistance(lat1, lon1, lat2, lon2);
    const duration = this.googleEarthEngineService.estimateFlightDuration(distance, aircraftType);
    
    return {
      distance: distance,
      duration: duration,
      distanceText: `${distance.toFixed(1)} km`,
      durationText: `${(duration / 3600).toFixed(1)} hours`,
      aircraftType: aircraftType,
    };
  }
} 