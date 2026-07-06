import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';
// FixedRoute import removed - no longer used
import { Aircraft } from '../../common/entities/aircraft.entity';
import { AircraftTypeImagePlaceholder } from '../../common/entities/aircraft-type-image-placeholder.entity';
import { AmenitiesService } from '../amenities/amenities.service';
import { GoogleEarthEngineService } from '../google-earth-engine/google-earth-engine.service';
import { FilterCharterDealsDto } from './dto/filter-charter-deals.dto';
import { GroupedCharterDeal, PaginatedGroupedResponse } from './interfaces/grouped-charter-deals.interface';

export interface CharterDealWithRelations {
  id: number;
  companyId: number;
  aircraftId: number;
  date: Date;
  time: string;
  pricePerSeat: number | null;
  discountPerSeat: number;
  availableSeats: number;
  createdAt: Date;
  updatedAt: Date;
  companyName: string;
  companyLogo: string | null;
  originName: string;
  destinationName: string;
  routeImageUrl: string;
  aircraftName: string;
  aircraftType: string;
  aircraftCapacity: number;
  // New fields from existing database
  aircraftImages: string[];
  routeImages: string[];
  // Dynamic fields
  duration: string | Promise<string>;
  amenities: Array<{icon: string, name: string}> | Promise<Array<{icon: string, name: string}>>;
}

@Injectable()
export class CharterDealsService {
  // Route durations are derived from geocoded coordinates and aircraft type,
  // none of which change between requests, so cache them in-process.
  private readonly durationCache = new Map<string, string>();

  // The default deal listing (homepage, fleet page) is requested heavily and
  // rarely changes second-to-second, so cache short-lived responses keyed by
  // their query params to avoid repeating the full query+enrichment pipeline.
  private readonly listCache = new Map<string, { value: { deals: CharterDealWithRelations[]; total: number }; expiresAt: number }>();
  private readonly LIST_CACHE_TTL_MS = 30 * 1000;

  constructor(
    @InjectRepository(CharterDeal)
    private charterDealRepository: Repository<CharterDeal>,
    @InjectRepository(ChartersCompany)
    private companyRepository: Repository<ChartersCompany>,
    // FixedRoute repository removed - no longer used
    @InjectRepository(Aircraft)
    private aircraftRepository: Repository<Aircraft>,
    @InjectRepository(AircraftTypeImagePlaceholder)
    private aircraftTypeImagePlaceholderRepository: Repository<AircraftTypeImagePlaceholder>,
    private amenitiesService: AmenitiesService,
    private googleEarthEngineService: GoogleEarthEngineService,
  ) {}

  async findAllWithRelations(
    page: number = 1,
    limit: number = 10,
    searchQuery?: string,
    dealType?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ deals: CharterDealWithRelations[]; total: number }> {
    const cacheKey = JSON.stringify({ page, limit, searchQuery, dealType, fromDate, toDate });
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.fetchAllWithRelations(page, limit, searchQuery, dealType, fromDate, toDate);
    this.listCache.set(cacheKey, { value: result, expiresAt: Date.now() + this.LIST_CACHE_TTL_MS });
    return result;
  }

  private async fetchAllWithRelations(
    page: number = 1,
    limit: number = 10,
    searchQuery?: string,
    dealType?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ deals: CharterDealWithRelations[]; total: number }> {
    const offset = (page - 1) * limit;

    let query = this.charterDealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.company', 'company')
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .leftJoin('aircraft_images', 'images', 'images.aircraftId = aircraft.id')
      .where('company.status = :status', { status: 'active' })
      .andWhere('aircraft.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' });

    // Add search filters
    if (searchQuery) {
      query = query.andWhere(
        '(company.companyName LIKE :search OR deal.originName as deal_originName LIKE :search OR deal.destinationName as deal_destinationName LIKE :search OR aircraft.name LIKE :search)',
        { search: `%${searchQuery}%` }
      );
    }

// Add deal type filter - disabled since dealType column does not exist in DB
// Add deal type filter - disabled since dealType column does not exist in DB
// Add deal type filter - disabled since dealType column does not exist in DB
// Add deal type filter - disabled since dealType column does not exist in DB

    // Add date filters
    if (fromDate) {
      query = query.andWhere('deal.date >= :fromDate', { fromDate });
    }

    if (toDate) {
      query = query.andWhere('deal.date <= :toDate', { toDate });
    }

    // Get total count
    const total = await query.getCount();

    // Get paginated results
    const deals = await query
      .select([
        'deal.id',
        'deal.companyId',
        'deal.aircraftId',
        'deal.date',
        'deal.time',
        'deal.pricePerSeat',
        'deal.discountPerSeat',
        'deal.availableSeats',
        'deal.createdAt',
        'deal.updatedAt',
        'company.companyName',
        'company.logo',
        'deal.originName as deal_originName',
        'deal.destinationName as deal_destinationName',
        'aircraft.name',
        'aircraft.type',
        'aircraft.capacity',
        'GROUP_CONCAT(images.url) as aircraftImages',
      ])
      .groupBy('deal.id')
      .orderBy('deal.date', 'ASC')
      .addOrderBy('deal.time', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    // Batch-fetch amenities for all aircraft in this page in a single query
    // instead of one query per deal (N+1).
    const amenitiesByAircraft = await this.amenitiesService.getAircraftAmenitiesBatch(
      deals.map((deal) => deal.deal_aircraftId),
    );

    // Transform the raw results to match the interface
    const transformedDeals: CharterDealWithRelations[] = await Promise.all(deals.map(async (deal) => ({
      id: deal.deal_id,
      companyId: deal.deal_companyId,
      aircraftId: deal.deal_aircraftId,
      date: deal.deal_date,
      time: deal.deal_time,
      pricePerSeat: deal.deal_pricePerSeat,
      discountPerSeat: deal.deal_discountPerSeat,
      availableSeats: deal.deal_availableSeats,
      createdAt: deal.deal_createdAt,
      updatedAt: deal.deal_updatedAt,
      companyName: deal.company_companyName,
      companyLogo: deal.company_logo,
      originName: deal.deal_originName,
      destinationName: deal.deal_destinationName,
      routeImageUrl: "", // Not available in current DB schema
      aircraftName: deal.aircraft_name,
      aircraftType: deal.aircraft_type,
      aircraftCapacity: deal.aircraft_capacity,
      // New fields from existing database
      aircraftImages: deal.aircraftImages ? deal.aircraftImages.split(',') : [],
      routeImages: [], // Not available in current DB schema
      // Dynamic fields
      duration: await this.calculateDuration(deal.deal_originName, deal.deal_destinationName, deal.aircraft_type),
      amenities: this.formatAmenities(amenitiesByAircraft.get(deal.deal_aircraftId) || []),
    })));

    return { deals: transformedDeals, total };
  }

  async findById(id: number): Promise<CharterDealWithRelations | null> {
    const deal = await this.charterDealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.company', 'company')
      
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .leftJoin('aircraft_images', 'images', 'images.aircraftId = aircraft.id')
      .where('deal.id = :id', { id })
      .select([
        'deal.id',
        'deal.companyId',
        'deal.aircraftId',
        'deal.date',
        'deal.time',
        'deal.pricePerSeat',
        'deal.discountPerSeat',
        'deal.availableSeats',
        'deal.createdAt',
        'deal.updatedAt',
        'company.companyName',
        'company.logo',
        'deal.originName as deal_originName',
        'deal.destinationName as deal_destinationName',
        'aircraft.name',
        'aircraft.type',
        'aircraft.capacity',
        'GROUP_CONCAT(images.url) as aircraftImages',
      ])
      .groupBy('deal.id')
      .getRawOne();

    if (!deal) return null;

    return {
      id: deal.deal_id,
      companyId: deal.deal_companyId,
      aircraftId: deal.deal_aircraftId,
      date: deal.deal_date,
      time: deal.deal_time,
      pricePerSeat: deal.deal_pricePerSeat,
      discountPerSeat: deal.deal_discountPerSeat,
      availableSeats: deal.deal_availableSeats,
      createdAt: deal.deal_createdAt,
      updatedAt: deal.deal_updatedAt,
      companyName: deal.company_companyName,
      companyLogo: deal.company_logo,
      originName: deal.deal_originName,
      destinationName: deal.deal_destinationName,
      routeImageUrl: "", // Not available in current DB schema
      aircraftName: deal.aircraft_name,
      aircraftType: deal.aircraft_type,
      aircraftCapacity: deal.aircraft_capacity,
      // New fields from existing database
      aircraftImages: deal.aircraftImages ? deal.aircraftImages.split(',') : [],
      routeImages: [], // Not available in current DB schema
      // Placeholder fields
      duration: await this.calculateDuration(deal.deal_originName, deal.deal_destinationName),
      amenities: await this.getAircraftAmenities(deal.deal_aircraftId),
    };
  }

  async findByCompany(
    companyId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ deals: CharterDealWithRelations[]; total: number }> {
    const offset = (page - 1) * limit;

    let query = this.charterDealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.company', 'company')
      
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .leftJoin('aircraft_images', 'images', 'images.aircraftId = aircraft.id')
      .where('deal.companyId = :companyId', { companyId });

    const total = await query.getCount();

    const deals = await query
      .select([
        'deal.id',
        'deal.companyId',
        'deal.aircraftId',
        'deal.date',
        'deal.time',
        'deal.pricePerSeat',
        'deal.discountPerSeat',
        'deal.availableSeats',
        'deal.createdAt',
        'deal.updatedAt',
        'company.companyName',
        'company.logo',
        'deal.originName as deal_originName',
        'deal.destinationName as deal_destinationName',
        'aircraft.name',
        'aircraft.type',
        'aircraft.capacity',
        'GROUP_CONCAT(images.url) as aircraftImages',
      ])
      .groupBy('deal.id')
      .orderBy('deal.date', 'ASC')
      .addOrderBy('deal.time', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    const amenitiesByAircraft = await this.amenitiesService.getAircraftAmenitiesBatch(
      deals.map((deal) => deal.deal_aircraftId),
    );

    const transformedDeals: CharterDealWithRelations[] = await Promise.all(deals.map(async (deal) => ({
      id: deal.deal_id,
      companyId: deal.deal_companyId,
      aircraftId: deal.deal_aircraftId,
      date: deal.deal_date,
      time: deal.deal_time,
      pricePerSeat: deal.deal_pricePerSeat,
      discountPerSeat: deal.deal_discountPerSeat,
      availableSeats: deal.deal_availableSeats,
      createdAt: deal.deal_createdAt,
      updatedAt: deal.deal_updatedAt,
      companyName: deal.company_companyName,
      companyLogo: deal.company_logo,
      originName: deal.deal_originName,
      destinationName: deal.deal_destinationName,
      routeImageUrl: "", // Not available in current DB schema
      aircraftName: deal.aircraft_name,
      aircraftType: deal.aircraft_type,
      aircraftCapacity: deal.aircraft_capacity,
      // New fields from existing database
      aircraftImages: deal.aircraftImages ? deal.aircraftImages.split(',') : [],
      routeImages: [], // Not available in current DB schema
      // Placeholder fields
      duration: await this.calculateDuration(deal.deal_originName, deal.deal_destinationName),
      amenities: this.formatAmenities(amenitiesByAircraft.get(deal.deal_aircraftId) || []),
    })));

    return { deals: transformedDeals, total };
  }

  async findByRoute(
    origin: string,
    destination: string,
    page: number = 1,
    limit: number = 10,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ deals: CharterDealWithRelations[]; total: number }> {
    const offset = (page - 1) * limit;

    let query = this.charterDealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.company', 'company')
      
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .leftJoin('aircraft_images', 'images', 'images.aircraftId = aircraft.id')
      .where('company.status = :status', { status: 'active' })
      .andWhere('aircraft.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' })
      .andWhere('deal.originName as deal_originName = :origin', { origin })
      .andWhere('deal.destinationName as deal_destinationName = :destination', { destination });

    if (fromDate) {
      query = query.andWhere('deal.date >= :fromDate', { fromDate });
    }

    if (toDate) {
      query = query.andWhere('deal.date <= :toDate', { toDate });
    }

    const total = await query.getCount();

    const deals = await query
      .select([
        'deal.id',
        'deal.companyId',
        'deal.aircraftId',
        'deal.date',
        'deal.time',
        'deal.pricePerSeat',
        'deal.discountPerSeat',
        'deal.availableSeats',
        'deal.createdAt',
        'deal.updatedAt',
        'company.companyName',
        'company.logo',
        'deal.originName as deal_originName',
        'deal.destinationName as deal_destinationName',
        'aircraft.name',
        'aircraft.type',
        'aircraft.capacity',
        'GROUP_CONCAT(images.url) as aircraftImages',
      ])
      .groupBy('deal.id')
      .orderBy('deal.date', 'ASC')
      .addOrderBy('deal.time', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    const amenitiesByAircraft = await this.amenitiesService.getAircraftAmenitiesBatch(
      deals.map((deal) => deal.deal_aircraftId),
    );

    const transformedDeals: CharterDealWithRelations[] = await Promise.all(deals.map(async (deal) => ({
      id: deal.deal_id,
      companyId: deal.deal_companyId,
      aircraftId: deal.deal_aircraftId,
      date: deal.deal_date,
      time: deal.deal_time,
      pricePerSeat: deal.deal_pricePerSeat,
      discountPerSeat: deal.deal_discountPerSeat,
      availableSeats: deal.deal_availableSeats,
      createdAt: deal.deal_createdAt,
      updatedAt: deal.deal_updatedAt,
      companyName: deal.company_companyName,
      companyLogo: deal.company_logo,
      originName: deal.deal_originName,
      destinationName: deal.deal_destinationName,
      routeImageUrl: "", // Not available in current DB schema
      aircraftName: deal.aircraft_name,
      aircraftType: deal.aircraft_type,
      aircraftCapacity: deal.aircraft_capacity,
      // New fields from existing database
      aircraftImages: deal.aircraftImages ? deal.aircraftImages.split(',') : [],
      routeImages: [], // Not available in current DB schema
      // Placeholder fields
      duration: await this.calculateDuration(deal.deal_originName, deal.deal_destinationName),
      amenities: this.formatAmenities(amenitiesByAircraft.get(deal.deal_aircraftId) || []),
    })));

    return { deals: transformedDeals, total };
  }

  // Calculate duration based on route using Google Earth Engine
  private async calculateDuration(origin: string, destination: string, aircraftType?: string): Promise<string> {
    if (!origin || !destination) return '';

    const cacheKey = `${origin}|${destination}|${aircraftType || ''}`;
    const cached = this.durationCache.get(cacheKey);
    if (cached) return cached;

    const duration = await this.computeDuration(origin, destination, aircraftType);
    this.durationCache.set(cacheKey, duration);
    return duration;
  }

  private async computeDuration(origin: string, destination: string, aircraftType?: string): Promise<string> {
    try {
      // Get coordinates for origin and destination in parallel
      const [originLocation, destinationLocation] = await Promise.all([
        this.getLocationCoordinates(origin),
        this.getLocationCoordinates(destination),
      ]);

      if (!originLocation || !destinationLocation) {
        // Fallback: Provide estimated duration based on aircraft type
        return this.getEstimatedDuration(aircraftType);
      }
      
      // Calculate flight distance using Haversine formula
      const distance = this.googleEarthEngineService.calculateFlightDistance(
        originLocation.lat,
        originLocation.lng,
        destinationLocation.lat,
        destinationLocation.lng
      );
      
      // Estimate flight duration based on aircraft type
      const durationInSeconds = this.googleEarthEngineService.estimateFlightDuration(
        distance,
        aircraftType
      );
      
      // Convert to hours and minutes
      const hours = Math.floor(durationInSeconds / 3600);
      const minutes = Math.floor((durationInSeconds % 3600) / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      // Log the error but don't let it break the entire request
      console.error('Error calculating flight duration:', error);
      // Fallback: Provide estimated duration based on aircraft type
      return this.getEstimatedDuration(aircraftType);
    }
  }

  // Fallback method to provide estimated duration when Google Maps API is not available
  private getEstimatedDuration(aircraftType?: string): string {
    // Provide reasonable estimates based on aircraft type
    switch (aircraftType?.toLowerCase()) {
      case 'jet':
        return '1h 30m'; // Typical jet flight duration
      case 'turboprop':
        return '2h 15m'; // Typical turboprop flight duration
      case 'helicopter':
        return '45m'; // Typical helicopter flight duration
      case 'propeller':
        return '2h 30m'; // Typical propeller flight duration
      default:
        return '1h 45m'; // Default estimate
    }
  }

  // Helper method to get coordinates for a location
  private async getLocationCoordinates(locationName: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // Search for the location using Google Places API
      const searchResults = await this.googleEarthEngineService.searchLocations({
        query: locationName,
        type: 'airport', // Prioritize airports for flight routes
      });
      
      if (searchResults.length > 0) {
        return searchResults[0].location;
      }
      
      // If no airport found, try a broader search
      const broaderResults = await this.googleEarthEngineService.searchLocations({
        query: locationName,
      });
      
      if (broaderResults.length > 0) {
        return broaderResults[0].location;
      }
      
      return null;
    } catch (error) {
      // Log the error but don't let it break the entire request
      console.error(`Error getting coordinates for ${locationName}:`, error);
      // Return null to indicate coordinates couldn't be found, but don't throw
      return null;
    }
  }

  // Get amenities for a single aircraft ID using the real amenities service
  private async getAircraftAmenities(aircraftId: number): Promise<Array<{icon: string, name: string}>> {
    try {
      const amenities = await this.amenitiesService.getAircraftAmenities(aircraftId);
      return this.formatAmenities(amenities);
    } catch (error) {
      // Log the error but don't let it break the entire request
      console.error('Error fetching aircraft amenities:', error);
      // Return empty array instead of hardcoded fallback
      return [];
    }
  }

  // Dedupe by name and shape amenities for the API response
  private formatAmenities(amenities: Array<{ name: string }>): Array<{icon: string, name: string}> {
    const uniqueAmenities = amenities.filter((amenity, index, self) =>
      index === self.findIndex(a => a.name === amenity.name)
    );

    return uniqueAmenities.map(amenity => ({
      icon: 'star', // Generic icon - frontend can map based on amenity name
      name: amenity.name
    }));
  }

  // Enhanced method with all new filters and grouping
  async findAllWithEnhancedFilters(
    filters: FilterCharterDealsDto,
  ): Promise<PaginatedGroupedResponse> {
    const {
      page = 1,
      limit = 10,
      search,
      dealType,
      fromDate,
      toDate,
      aircraftTypeImagePlaceholderId,
      origin,
      destination,
      userLat,
      userLng,
      groupBy = false,
    } = filters;

    const offset = (page - 1) * limit;

    let query = this.charterDealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.company', 'company')
      
      .leftJoinAndSelect('deal.aircraft', 'aircraft')
      .leftJoinAndSelect('aircraft.aircraftTypeImagePlaceholder', 'aircraftType')
      .leftJoin('aircraft_images', 'images', 'images.aircraftId = aircraft.id')
      .where('company.status = :status', { status: 'active' })
      .andWhere('aircraft.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' });

    // Add search filters
    if (search) {
      query = query.andWhere(
        '(company.companyName LIKE :search OR deal.originName as deal_originName LIKE :search OR deal.destinationName as deal_destinationName LIKE :search OR aircraft.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

// Add deal type filter - disabled since dealType column does not exist in DB
// Add deal type filter - disabled since dealType column does not exist in DB
// Add deal type filter - disabled since dealType column does not exist in DB
// Add deal type filter - disabled since dealType column does not exist in DB

    // Add date filters
    if (fromDate) {
      query = query.andWhere('deal.date >= :fromDate', { fromDate });
    }

    if (toDate) {
      query = query.andWhere('deal.date <= :toDate', { toDate });
    }

    // Add aircraft type filter
    if (aircraftTypeImagePlaceholderId) {
      query = query.andWhere('aircraft.aircraftTypeImagePlaceholderId = :aircraftTypeId', { aircraftTypeId: aircraftTypeImagePlaceholderId });
    }

    // Add route filters
    if (origin) {
      query = query.andWhere('deal.originName as deal_originName LIKE :origin', { origin: `%${origin}%` });
    }

    if (destination) {
      query = query.andWhere('deal.destinationName as deal_destinationName LIKE :destination', { destination: `%${destination}%` });
    }

    // Get total count
    const total = await query.getCount();

    // Add pagination
    query = query
      .select([
        'deal.id',
        'deal.companyId',
        'deal.aircraftId',
        'deal.date',
        'deal.time',
        'deal.pricePerSeat',
        'deal.discountPerSeat',
        'deal.availableSeats',
        'deal.createdAt',
        'deal.updatedAt',
        'company.companyName',
        'company.logo',
        'deal.originName as deal_originName',
        'deal.destinationName as deal_destinationName',
        'aircraft.name',
        'aircraft.type',
        'aircraft.capacity',
        'aircraft.aircraftTypeImagePlaceholderId',
        'aircraftType.placeholderImageUrl',
        'GROUP_CONCAT(images.url) as aircraftImages',
      ])
      .groupBy('deal.id')
      .orderBy('deal.date', 'ASC')
      .addOrderBy('deal.time', 'ASC')
      .offset(offset)
      .limit(limit);

    const deals = await query.getRawMany();

    if (groupBy) {
      return this.groupDealsByAircraftTypeAndRoute(deals, userLat, userLng, total, page, limit);
    } else {
      // Return regular paginated response
      const amenitiesByAircraft = await this.amenitiesService.getAircraftAmenitiesBatch(
        deals.map((deal) => deal.deal_aircraftId),
      );

      const transformedDeals = await Promise.all(deals.map(async (deal) => ({
        id: deal.deal_id,
        companyId: deal.deal_companyId,
        aircraftId: deal.deal_aircraftId,
        date: deal.deal_date,
        time: deal.deal_time,
        pricePerSeat: deal.deal_pricePerSeat,
        discountPerSeat: deal.deal_discountPerSeat,
        availableSeats: deal.deal_availableSeats,
        createdAt: deal.deal_createdAt,
        updatedAt: deal.deal_updatedAt,
        companyName: deal.company_companyName,
        companyLogo: deal.company_logo,
        originName: deal.deal_originName,
        destinationName: deal.deal_destinationName,
        routeImageUrl: "", // Not available in current DB schema
        aircraftName: deal.aircraft_name,
        aircraftType: deal.aircraft_type,
        aircraftCapacity: deal.aircraft_capacity,
        aircraftImages: deal.aircraftImages ? deal.aircraftImages.split(',') : [],
        routeImages: [], // Not available in current DB schema
        duration: await this.calculateDuration(deal.deal_originName, deal.deal_destinationName, deal.aircraft_type),
        amenities: this.formatAmenities(amenitiesByAircraft.get(deal.deal_aircraftId) || []),
      })));

      return {
        success: true,
        data: transformedDeals as any,
        total,
        page,
        limit,
        totalGroups: 1,
      };
    }
  }

  // Group deals by aircraft type and route
  private async groupDealsByAircraftTypeAndRoute(
    deals: any[],
    userLat?: number,
    userLng?: number,
    total: number = 0,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedGroupedResponse> {
    const amenitiesByAircraft = await this.amenitiesService.getAircraftAmenitiesBatch(
      deals.map((deal) => deal.deal_aircraftId),
    );

    const groupedMap = new Map<string, any[]>();

    // Group deals by aircraft type ID and route
    for (const deal of deals) {
      const aircraftTypeId = deal.aircraft_aircraftTypeImagePlaceholderId || 0;
      const routeKey = `${deal.deal_originName}-${deal.deal_destinationName}`;
      const groupKey = `${aircraftTypeId}-${routeKey}`;

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, []);
      }
      groupedMap.get(groupKey)!.push(deal);
    }

    // Transform grouped deals
    const groupedDeals: GroupedCharterDeal[] = [];

    for (const [groupKey, groupDeals] of groupedMap) {
      if (groupDeals.length === 0) continue;

      const firstDeal = groupDeals[0];
      const aircraftTypeId = firstDeal.aircraft_aircraftTypeImagePlaceholderId || 0;
      const aircraftType = firstDeal.aircraft_type || 'unknown';
      const aircraftTypeImageUrl = firstDeal.aircraftType_placeholderImageUrl || '';

      // Calculate distance from user if coordinates provided
      let distanceFromUser: number | undefined;
      if (userLat && userLng && firstDeal.deal_originName) {
        try {
          const originLocation = await this.getLocationCoordinates(firstDeal.deal_originName);
          if (originLocation) {
            distanceFromUser = this.googleEarthEngineService.calculateFlightDistance(
              userLat,
              userLng,
              originLocation.lat,
              originLocation.lng
            );
          }
        } catch (error) {
          // Log the error but don't let it break the entire request
          console.error('Error calculating distance from user:', error);
          // Continue without distance calculation
        }
      }

      // Transform deals in this group
      const transformedDeals = await Promise.all(groupDeals.map(async (deal) => ({
        id: deal.deal_id,
        companyId: deal.deal_companyId,
        aircraftId: deal.deal_aircraftId,
        date: deal.deal_date,
        time: deal.deal_time,
        pricePerSeat: deal.deal_pricePerSeat,
        discountPerSeat: deal.deal_discountPerSeat,
        availableSeats: deal.deal_availableSeats,
        createdAt: deal.deal_createdAt,
        updatedAt: deal.deal_updatedAt,
        companyName: deal.company_companyName,
        companyLogo: deal.company_logo,
        originName: deal.deal_originName,
        destinationName: deal.deal_destinationName,
        routeImageUrl: "", // Not available in current DB schema
        aircraftName: deal.aircraft_name,
        aircraftType: deal.aircraft_type,
        aircraftCapacity: deal.aircraft_capacity,
        aircraftImages: deal.aircraftImages ? deal.aircraftImages.split(',') : [],
        routeImages: [], // Not available in current DB schema
        duration: await this.calculateDuration(deal.deal_originName, deal.deal_destinationName, deal.aircraft_type),
        amenities: this.formatAmenities(amenitiesByAircraft.get(deal.deal_aircraftId) || []),
      })));

      groupedDeals.push({
        aircraftTypeId,
        aircraftType,
        aircraftTypeImageUrl,
        route: {
          origin: firstDeal.deal_originName || '',
          destination: firstDeal.deal_destinationName || '',
          distanceFromUser,
        },
        deals: transformedDeals as any[],
      });
    }

    // Sort by distance from user if coordinates provided
    if (userLat && userLng) {
      groupedDeals.sort((a, b) => {
        const distanceA = a.route.distanceFromUser || Infinity;
        const distanceB = b.route.distanceFromUser || Infinity;
        return distanceA - distanceB;
      });
    }

    return {
      success: true,
      data: groupedDeals,
      total,
      page,
      limit,
      totalGroups: groupedDeals.length,
    };
  }

  // Debug method to check database connectivity and data
  async debugDatabaseConnection(): Promise<any> {
    try {
      // Check if charter_deals table has data
      const dealsCount = await this.charterDealRepository.count();
      
      // Check if companies table has data
      const companiesCount = await this.companyRepository.count();
      
      // Check if aircraft table has data
      const aircraftCount = await this.aircraftRepository.count();
      
      // Get a sample deal with basic query
      const sampleDeal = await this.charterDealRepository
        .createQueryBuilder('deal')
        .select(['deal.id', 'deal.originName', 'deal.destinationName'])
        .limit(1)
        .getOne();
      
      // Check if there are any active companies
      const activeCompanies = await this.companyRepository
        .createQueryBuilder('company')
        .where('company.status = :status', { status: 'active' })
        .getCount();
      
      // Check if there are any available aircraft
      const availableAircraft = await this.aircraftRepository
        .createQueryBuilder('aircraft')
        .where('aircraft.isAvailable = :isAvailable', { isAvailable: true })
        .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' })
        .getCount();
      
      return {
        dealsCount,
        companiesCount,
        aircraftCount,
        activeCompanies,
        availableAircraft,
        sampleDeal,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
  }
} 