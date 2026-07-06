import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GoogleEarthEngineSearchDto, GoogleEarthEngineReverseGeocodeDto, GoogleEarthEngineDistanceDto, GoogleEarthEngineLocationDto } from './dto/google-earth-engine.dto';

@Injectable()
export class GoogleEarthEngineService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  // Free, no-card-required fallback for place search when Google Places is
  // unavailable (e.g. billing not yet enabled on the Google Cloud project).
  // Same GoogleEarthEngineLocationDto shape is returned either way, so
  // callers never need to know which provider actually answered.
  private readonly locationIqApiKey: string;
  private readonly locationIqBaseUrl = 'https://api.locationiq.com/v1';

  // Place coordinates are effectively static, so search results are cached
  // in-process to avoid repeated external API round-trips for the same query
  // (e.g. the same route names appearing across many charter deals/listings).
  private readonly searchCache = new Map<string, { value: GoogleEarthEngineLocationDto[]; expiresAt: number }>();
  private readonly searchInFlight = new Map<string, Promise<GoogleEarthEngineLocationDto[]>>();
  private readonly SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    this.locationIqApiKey = this.configService.get<string>('LOCATIONIQ_API_KEY');
  }

  async searchLocations(searchDto: GoogleEarthEngineSearchDto): Promise<GoogleEarthEngineLocationDto[]> {
    if (!this.apiKey && !this.locationIqApiKey) {
      throw new HttpException('No location search provider configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const cacheKey = JSON.stringify({
      query: searchDto.query,
      type: searchDto.type || 'establishment',
      location: searchDto.location,
      radius: searchDto.radius || 2000000,
    });

    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inFlight = this.searchInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const requestPromise = this.fetchSearchLocations(searchDto).then((value) => {
      this.searchCache.set(cacheKey, { value, expiresAt: Date.now() + this.SEARCH_CACHE_TTL_MS });
      this.searchInFlight.delete(cacheKey);
      return value;
    }).catch((error) => {
      this.searchInFlight.delete(cacheKey);
      throw error;
    });

    this.searchInFlight.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private async fetchSearchLocations(searchDto: GoogleEarthEngineSearchDto): Promise<GoogleEarthEngineLocationDto[]> {
    if (this.apiKey) {
      try {
        return await this.fetchFromGoogle(searchDto);
      } catch (error) {
        if (!this.locationIqApiKey) {
          throw new HttpException(`Location search failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        // Fall through to LocationIQ below (e.g. Google billing not enabled yet).
      }
    }

    if (this.locationIqApiKey) {
      return this.fetchFromLocationIq(searchDto);
    }

    throw new HttpException('Location search failed: no provider available', HttpStatus.SERVICE_UNAVAILABLE);
  }

  private async fetchFromGoogle(searchDto: GoogleEarthEngineSearchDto): Promise<GoogleEarthEngineLocationDto[]> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/place/textsearch/json`, {
        params: {
          query: searchDto.query,
          key: this.apiKey,
          type: searchDto.type || 'establishment',
          location: searchDto.location,
          radius: searchDto.radius || 2000000, // 2000km default for air travel
        },
      })
    );

    // Handle different API response statuses gracefully
    if (response.data.status === 'ZERO_RESULTS') {
      // Return empty array instead of throwing error for no results
      return [];
    }

    if (response.data.status !== 'OK') {
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    return response.data.results.map(place => ({
      placeId: place.place_id,
      name: place.name,
      formattedAddress: place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      types: place.types,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
    }));
  }

  private async fetchFromLocationIq(searchDto: GoogleEarthEngineSearchDto): Promise<GoogleEarthEngineLocationDto[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.locationIqBaseUrl}/autocomplete`, {
          params: {
            key: this.locationIqApiKey,
            q: searchDto.query,
            format: 'json',
            limit: 8,
          },
        })
      );

      const results = Array.isArray(response.data) ? response.data : [];
      return results
        .filter((place: any) => place.lat != null && place.lon != null)
        .map((place: any) => ({
          placeId: String(place.place_id),
          name: place.display_place || place.display_name?.split(',')[0] || place.display_name,
          formattedAddress: place.display_name,
          location: {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
          },
          types: place.type ? [place.type] : undefined,
        }));
    } catch (error) {
      // LocationIQ responds 404 for "no results" - treat that as an empty
      // list rather than an error, matching Google's ZERO_RESULTS behavior.
      if (error?.response?.status === 404) {
        return [];
      }
      throw new HttpException(`Location search failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPlaceDetails(placeId: string): Promise<GoogleEarthEngineLocationDto> {
    if (!this.apiKey) {
      throw new HttpException('Google Maps API key not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/place/details/json`, {
          params: {
            place_id: placeId,
            key: this.apiKey,
            fields: 'place_id,name,formatted_address,geometry,types,rating,user_ratings_total',
          },
        })
      );

      if (response.data.status !== 'OK') {
        throw new HttpException(`Google Places API error: ${response.data.status}`, HttpStatus.BAD_REQUEST);
      }

      const place = response.data.result;
      return {
        placeId: place.place_id,
        name: place.name,
        formattedAddress: place.formatted_address,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        types: place.types,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
      };
    } catch (error) {
      throw new HttpException(`Place details failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async reverseGeocode(reverseGeocodeDto: GoogleEarthEngineReverseGeocodeDto): Promise<GoogleEarthEngineLocationDto> {
    if (!this.apiKey) {
      throw new HttpException('Google Maps API key not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/geocode/json`, {
          params: {
            latlng: `${reverseGeocodeDto.latitude},${reverseGeocodeDto.longitude}`,
            key: this.apiKey,
          },
        })
      );

      if (response.data.status !== 'OK') {
        throw new HttpException(`Google Geocoding API error: ${response.data.status}`, HttpStatus.BAD_REQUEST);
      }

      const result = response.data.results[0];
      return {
        placeId: result.place_id,
        name: this.extractLocationName(result),
        formattedAddress: result.formatted_address,
        location: {
          lat: reverseGeocodeDto.latitude,
          lng: reverseGeocodeDto.longitude,
        },
        types: result.types,
      };
    } catch (error) {
      throw new HttpException(`Reverse geocoding failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async calculateDistance(distanceDto: GoogleEarthEngineDistanceDto): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Google Maps API key not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/distancematrix/json`, {
          params: {
            origins: `${distanceDto.origin.lat},${distanceDto.origin.lng}`,
            destinations: `${distanceDto.destination.lat},${distanceDto.destination.lng}`,
            key: this.apiKey,
            mode: distanceDto.mode || 'driving',
            units: 'metric',
          },
        })
      );

      if (response.data.status !== 'OK') {
        throw new HttpException(`Google Distance Matrix API error: ${response.data.status}`, HttpStatus.BAD_REQUEST);
      }

      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance,
        duration: element.duration,
        status: element.status,
      };
    } catch (error) {
      throw new HttpException(`Distance calculation failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  calculateFlightDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  estimateFlightDuration(distance: number, aircraftType: string = 'jet'): number {
    // Average speeds in km/h for different aircraft types
    const speeds = {
      jet: 800,
      turboprop: 500,
      helicopter: 250,
      small: 300,
    };

    const speed = speeds[aircraftType] || speeds.jet;
    return (distance / speed) * 3600; // Return duration in seconds
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private extractLocationName(result: any): string {
    // Try to extract the most relevant name from address components
    const components = result.address_components;
    const nameComponent = components.find(comp => 
      comp.types.includes('establishment') || 
      comp.types.includes('point_of_interest') ||
      comp.types.includes('airport')
    );
    
    return nameComponent ? nameComponent.long_name : result.formatted_address;
  }
} 