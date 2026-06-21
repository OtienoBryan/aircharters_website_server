import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Amenity } from '../../common/entities/amenity.entity';
import { AircraftAmenity } from '../../common/entities/aircraft-amenity.entity';
import { CharterDealAmenity } from '../../common/entities/charter-deal-amenity.entity';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { AssignAmenitiesDto } from './dto/assign-amenities.dto';

@Injectable()
export class AmenitiesService {
  constructor(
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
    @InjectRepository(AircraftAmenity)
    private readonly aircraftAmenityRepository: Repository<AircraftAmenity>,
    @InjectRepository(CharterDealAmenity)
    private readonly charterDealAmenityRepository: Repository<CharterDealAmenity>,
  ) {}

  /**
   * Create a new amenity
   */
  async create(createAmenityDto: CreateAmenityDto): Promise<Amenity> {
    const { name } = createAmenityDto;
    
    // Check if amenity with same name already exists
    const existingAmenity = await this.amenityRepository.findOne({
      where: { name: name.trim() }
    });

    if (existingAmenity) {
      throw new ConflictException(`Amenity with name "${name}" already exists`);
    }

    const amenity = this.amenityRepository.create({
      name: name.trim()
    });

    return await this.amenityRepository.save(amenity);
  }

  /**
   * Get all amenities
   */
  async findAll(): Promise<Amenity[]> {
    return await this.amenityRepository.find({
      order: { name: 'ASC' }
    });
  }

  /**
   * Get amenity by ID
   */
  async findOne(id: number): Promise<Amenity> {
    const amenity = await this.amenityRepository.findOne({
      where: { id }
    });

    if (!amenity) {
      throw new NotFoundException(`Amenity with ID ${id} not found`);
    }

    return amenity;
  }

  /**
   * Update amenity
   */
  async update(id: number, updateAmenityDto: UpdateAmenityDto): Promise<Amenity> {
    const amenity = await this.findOne(id);
    
    if (updateAmenityDto.name) {
      // Check if new name conflicts with existing amenity
      const existingAmenity = await this.amenityRepository.findOne({
        where: { name: updateAmenityDto.name.trim(), id: Not(id) }
      });

      if (existingAmenity) {
        throw new ConflictException(`Amenity with name "${updateAmenityDto.name}" already exists`);
      }

      amenity.name = updateAmenityDto.name.trim();
    }

    return await this.amenityRepository.save(amenity);
  }

  /**
   * Delete amenity
   */
  async remove(id: number): Promise<void> {
    const amenity = await this.findOne(id);
    
    // Check if amenity is being used by any aircraft or charter deals
    const aircraftUsage = await this.aircraftAmenityRepository.count({
      where: { amenityId: id }
    });

    const charterDealUsage = await this.charterDealAmenityRepository.count({
      where: { amenityId: id }
    });

    if (aircraftUsage > 0 || charterDealUsage > 0) {
      throw new ConflictException(
        `Cannot delete amenity. It is currently assigned to ${aircraftUsage} aircraft and ${charterDealUsage} charter deals.`
      );
    }

    await this.amenityRepository.remove(amenity);
  }

  /**
   * Get amenities for a specific aircraft
   */
  async getAircraftAmenities(aircraftId: number): Promise<Amenity[]> {
    const aircraftAmenities = await this.aircraftAmenityRepository.find({
      where: { aircraftId },
      relations: ['amenity'],
      order: { amenity: { name: 'ASC' } }
    });

    return aircraftAmenities.map(aa => aa.amenity);
  }

  /**
   * Get amenities for multiple aircraft in a single query, keyed by aircraftId.
   * Use this instead of calling getAircraftAmenities() in a loop to avoid N+1 queries.
   */
  async getAircraftAmenitiesBatch(aircraftIds: number[]): Promise<Map<number, Amenity[]>> {
    const result = new Map<number, Amenity[]>();
    const uniqueIds = [...new Set(aircraftIds)];
    if (uniqueIds.length === 0) return result;

    const aircraftAmenities = await this.aircraftAmenityRepository.find({
      where: { aircraftId: In(uniqueIds) },
      relations: ['amenity'],
    });

    for (const aa of aircraftAmenities) {
      const list = result.get(aa.aircraftId) || [];
      list.push(aa.amenity);
      result.set(aa.aircraftId, list);
    }

    for (const list of result.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }

  /**
   * Get amenities for a specific charter deal
   */
  async getCharterDealAmenities(dealId: number): Promise<Amenity[]> {
    const charterDealAmenities = await this.charterDealAmenityRepository.find({
      where: { dealId },
      relations: ['amenity'],
      order: { amenity: { name: 'ASC' } }
    });

    return charterDealAmenities.map(cda => cda.amenity);
  }

  /**
   * Assign amenities to an aircraft
   */
  async assignAmenitiesToAircraft(aircraftId: number, assignAmenitiesDto: AssignAmenitiesDto): Promise<void> {
    const { amenityIds } = assignAmenitiesDto;

    // Remove existing assignments
    await this.aircraftAmenityRepository.delete({ aircraftId });

    // Create new assignments
    const aircraftAmenities = amenityIds.map(amenityId => 
      this.aircraftAmenityRepository.create({
        aircraftId,
        amenityId
      })
    );

    await this.aircraftAmenityRepository.save(aircraftAmenities);
  }

  /**
   * Assign amenities to a charter deal
   */
  async assignAmenitiesToCharterDeal(dealId: number, assignAmenitiesDto: AssignAmenitiesDto): Promise<void> {
    const { amenityIds } = assignAmenitiesDto;

    // Remove existing assignments
    await this.charterDealAmenityRepository.delete({ dealId });

    // Create new assignments
    const charterDealAmenities = amenityIds.map(amenityId => 
      this.charterDealAmenityRepository.create({
        dealId,
        amenityId
      })
    );

    await this.charterDealAmenityRepository.save(charterDealAmenities);
  }

  /**
   * Get amenities with usage statistics
   */
  async getAmenitiesWithUsage(): Promise<any[]> {
    const amenities = await this.amenityRepository.find({
      order: { name: 'ASC' }
    });

    const amenitiesWithUsage = await Promise.all(
      amenities.map(async (amenity) => {
        const aircraftCount = await this.aircraftAmenityRepository.count({
          where: { amenityId: amenity.id }
        });

        const charterDealCount = await this.charterDealAmenityRepository.count({
          where: { amenityId: amenity.id }
        });

        return {
          ...amenity,
          aircraftCount,
          charterDealCount,
          totalUsage: aircraftCount + charterDealCount
        };
      })
    );

    return amenitiesWithUsage;
  }
}
