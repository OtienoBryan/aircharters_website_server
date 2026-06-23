import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { AircraftImage } from '../../common/entities/aircraft-image.entity';

const VALID_TYPES = [
  'helicopter', 'fixedWing', 'jet', 'glider', 'seaplane',
  'ultralight', 'balloon', 'tiltrotor', 'gyroplane', 'airship',
];

const VALID_SERVICE_TYPES = ['cargo', 'medical'];

export interface AircraftListItem {
  id: number;
  name: string;
  registrationNumber: string;
  type: string;
  model: string | null;
  manufacturer: string | null;
  yearManufactured: number | null;
  capacity: number;
  pricePerHour: number | null;
  cruiseSpeedKnots: number | null;
  maxLuggageCapacity: number | null;
  isAvailable: boolean;
  baseAirport: string | null;
  baseCity: string | null;
  companyId: number | null;
  companyName: string;
  imageUrl: string | null;
  images: string[];
  serviceType: string | null;
}

@Injectable()
export class AircraftService {
  // This list is requested every time someone opens a fleet page and rarely
  // changes second-to-second, so cache it briefly per type to avoid re-running
  // the same join/group-by query on every request.
  private readonly listCache = new Map<string, { value: AircraftListItem[]; expiresAt: number }>();
  private readonly LIST_CACHE_TTL_MS = 30 * 1000;

  constructor(
    @InjectRepository(Aircraft)
    private readonly aircraftRepository: Repository<Aircraft>,
    @InjectRepository(AircraftImage)
    private readonly aircraftImageRepository: Repository<AircraftImage>,
  ) {}

  async findImagesByAircraftId(aircraftId: number): Promise<{ id: number; category: string; url: string }[]> {
    const images = await this.aircraftImageRepository.find({
      where: { aircraftId },
      order: { createdAt: 'ASC' },
    });

    return images.map((image) => ({ id: image.id, category: image.category, url: image.url }));
  }

  async findByType(type: string): Promise<AircraftListItem[]> {
    if (!VALID_TYPES.includes(type)) {
      return [];
    }

    const cached = this.listCache.get(type);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.fetchAll({ type, onlyAvailable: true });
    this.listCache.set(type, { value: result, expiresAt: Date.now() + this.LIST_CACHE_TTL_MS });
    return result;
  }

  // Unlike findByType, this includes unavailable/in-maintenance aircraft so
  // the fleet roster page can show them with a "not available" badge instead
  // of silently hiding them.
  async findAll(): Promise<AircraftListItem[]> {
    const cacheKey = 'ALL';
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.fetchAll({ onlyAvailable: false });
    this.listCache.set(cacheKey, { value: result, expiresAt: Date.now() + this.LIST_CACHE_TTL_MS });
    return result;
  }

  async findByServiceType(serviceType: string): Promise<AircraftListItem[]> {
    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return [];
    }

    const cacheKey = `SERVICE:${serviceType}`;
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.fetchAll({ serviceType, onlyAvailable: false });
    this.listCache.set(cacheKey, { value: result, expiresAt: Date.now() + this.LIST_CACHE_TTL_MS });
    return result;
  }

  private async fetchAll(options: { type?: string; serviceType?: string; onlyAvailable: boolean }): Promise<AircraftListItem[]> {
    // Use plain joins + a single representative image per aircraft (instead of
    // leftJoinAndSelect on the full images collection) so the query doesn't
    // multiply rows per aircraft image and drag the whole gallery over the wire.
    let query = this.aircraftRepository
      .createQueryBuilder('aircraft')
      .leftJoin('aircraft.company', 'company')
      .leftJoin('aircraft.images', 'images')
      .leftJoin('aircraft.aircraftTypeImagePlaceholder', 'aircraftType')
      .where('company.status = :companyStatus', { companyStatus: 'active' });

    if (options.type) {
      query = query.andWhere('(aircraft.type = :type OR aircraftType.type = :type)', { type: options.type });
    }

    if (options.serviceType) {
      query = query.andWhere('aircraft.serviceType = :serviceType', { serviceType: options.serviceType });
    }

    if (options.onlyAvailable) {
      query = query
        .andWhere('aircraft.isAvailable = :isAvailable', { isAvailable: true })
        .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' });
    }

    const rows = await query
      .select([
        'aircraft.id AS id',
        'aircraft.name AS name',
        'aircraft.registrationNumber AS registrationNumber',
        'aircraft.type AS type',
        'aircraft.model AS model',
        'aircraft.manufacturer AS manufacturer',
        'aircraft.yearManufactured AS yearManufactured',
        'aircraft.capacity AS capacity',
        'aircraft.pricePerHour AS pricePerHour',
        'aircraft.cruiseSpeedKnots AS cruiseSpeedKnots',
        'aircraft.maxLuggageCapacity AS maxLuggageCapacity',
        'aircraft.serviceType AS serviceType',
        'aircraft.isAvailable AS isAvailable',
        'aircraft.maintenanceStatus AS maintenanceStatus',
        'aircraft.baseAirport AS baseAirport',
        'aircraft.baseCity AS baseCity',
        'company.id AS companyId',
        'company.companyName AS companyName',
        'aircraftType.placeholderImageUrl AS placeholderImageUrl',
        'MIN(images.url) AS imageUrl',
        'GROUP_CONCAT(DISTINCT images.url) AS allImages',
      ])
      .groupBy('aircraft.id')
      .addGroupBy('company.id')
      .addGroupBy('company.companyName')
      .addGroupBy('aircraftType.placeholderImageUrl')
      .getRawMany();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      registrationNumber: row.registrationNumber,
      type: row.type,
      model: row.model,
      manufacturer: row.manufacturer,
      yearManufactured: row.yearManufactured,
      capacity: row.capacity,
      pricePerHour: row.pricePerHour,
      cruiseSpeedKnots: row.cruiseSpeedKnots,
      maxLuggageCapacity: row.maxLuggageCapacity,
      serviceType: row.serviceType,
      isAvailable: Boolean(row.isAvailable) && row.maintenanceStatus === 'operational',
      baseAirport: row.baseAirport,
      baseCity: row.baseCity,
      companyId: row.companyId ?? null,
      companyName: row.companyName ?? 'Unknown',
      imageUrl: row.imageUrl || row.placeholderImageUrl || null,
      images: row.allImages ? row.allImages.split(',') : [],
    }));
  }
}
