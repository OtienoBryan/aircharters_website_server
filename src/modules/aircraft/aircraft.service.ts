import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aircraft } from '../../common/entities/aircraft.entity';

const VALID_TYPES = [
  'helicopter', 'fixedWing', 'jet', 'glider', 'seaplane',
  'ultralight', 'balloon', 'tiltrotor', 'gyroplane', 'airship',
];

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
  baseAirport: string | null;
  baseCity: string | null;
  companyId: number | null;
  companyName: string;
  imageUrl: string | null;
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
  ) {}

  async findByType(type: string): Promise<AircraftListItem[]> {
    if (!VALID_TYPES.includes(type)) {
      return [];
    }

    const cached = this.listCache.get(type);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.fetchByType(type);
    this.listCache.set(type, { value: result, expiresAt: Date.now() + this.LIST_CACHE_TTL_MS });
    return result;
  }

  private async fetchByType(type: string): Promise<AircraftListItem[]> {
    // Use plain joins + a single representative image per aircraft (instead of
    // leftJoinAndSelect on the full images collection) so the query doesn't
    // multiply rows per aircraft image and drag the whole gallery over the wire.
    const rows = await this.aircraftRepository
      .createQueryBuilder('aircraft')
      .leftJoin('aircraft.company', 'company')
      .leftJoin('aircraft.images', 'images')
      .leftJoin('aircraft.aircraftTypeImagePlaceholder', 'aircraftType')
      .where('(aircraft.type = :type OR aircraftType.type = :type)', { type })
      .andWhere('aircraft.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' })
      .andWhere('company.status = :companyStatus', { companyStatus: 'active' })
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
        'aircraft.baseAirport AS baseAirport',
        'aircraft.baseCity AS baseCity',
        'company.id AS companyId',
        'company.companyName AS companyName',
        'aircraftType.placeholderImageUrl AS placeholderImageUrl',
        'MIN(images.url) AS imageUrl',
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
      baseAirport: row.baseAirport,
      baseCity: row.baseCity,
      companyId: row.companyId ?? null,
      companyName: row.companyName ?? 'Unknown',
      imageUrl: row.imageUrl || row.placeholderImageUrl || null,
    }));
  }
}
