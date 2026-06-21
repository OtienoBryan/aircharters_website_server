import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Location, LocationType } from '../../common/entities/location.entity';
import { SearchLocationsDto } from './dto/search-locations.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  /**
   * Get all locations with optional filtering
   */
  async findAll(searchDto?: SearchLocationsDto): Promise<Location[]> {
    const query = this.locationRepository.createQueryBuilder('location');

    if (searchDto?.q) {
      query.andWhere(
        '(location.name LIKE :search OR location.code LIKE :search OR location.country LIKE :search)',
        { search: `%${searchDto.q}%` }
      );
    }

    if (searchDto?.type) {
      query.andWhere('location.type = :type', { type: searchDto.type });
    }

    if (searchDto?.country) {
      query.andWhere('location.country LIKE :country', { country: `%${searchDto.country}%` });
    }

    const limit = searchDto?.limit || 20;
    return query.limit(limit).getMany();
  }

  /**
   * Search locations by query
   */
  async searchLocations(query: string, limit: number = 10): Promise<Location[]> {
    return this.locationRepository.find({
      where: [
        { name: Like(`%${query}%`) },
        { code: Like(`%${query}%`) },
        { country: Like(`%${query}%`) },
      ],
      take: limit,
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Get location by ID
   */
  async findById(id: number): Promise<Location | null> {
    return this.locationRepository.findOne({ where: { id } });
  }

  /**
   * Get location by code
   */
  async findByCode(code: string): Promise<Location | null> {
    return this.locationRepository.findOne({ where: { code } });
  }

  /**
   * Get popular locations (airports and major cities)
   */
  async getPopularLocations(): Promise<Location[]> {
    return this.locationRepository.find({
      where: [
        { type: LocationType.AIRPORT },
        { type: LocationType.CITY },
      ],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Get locations by country
   */
  async getLocationsByCountry(country: string): Promise<Location[]> {
    return this.locationRepository.find({
      where: { country: Like(`%${country}%`) },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Calculate distance between two locations using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate flight duration based on distance
   * Assuming average speed of 800 km/h for jets, 300 km/h for helicopters
   */
  calculateFlightDuration(
    distance: number,
    aircraftType: 'jet' | 'helicopter' | 'fixedWing' = 'jet',
  ): number {
    const speeds = {
      jet: 800,
      helicopter: 300,
      fixedWing: 500,
    };
    const speed = speeds[aircraftType];
    return Math.ceil(distance / speed * 60); // Duration in minutes
  }

  /**
   * Get distance and duration between two locations
   */
  async getRouteInfo(
    originCode: string,
    destinationCode: string,
    aircraftType: 'jet' | 'helicopter' | 'fixedWing' = 'jet',
  ): Promise<{
    distance: number;
    duration: number;
    origin: Location;
    destination: Location;
  } | null> {
    const origin = await this.findByCode(originCode);
    const destination = await this.findByCode(destinationCode);

    if (!origin || !destination || !origin.latitude || !destination.latitude) {
      return null;
    }

    const distance = this.calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    );

    const duration = this.calculateFlightDuration(distance, aircraftType);

    return {
      distance: Math.round(distance),
      duration,
      origin,
      destination,
    };
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
} 