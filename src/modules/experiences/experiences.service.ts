import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExperienceTemplate } from '../../common/entities/experience-template.entity';
import { ExperienceImage } from '../../common/entities/experience-image.entity';
import { ExperienceCardDto, ExperienceCategoryDto, ExperienceDetailDto } from './dto/experience-response.dto';

@Injectable()
export class ExperiencesService {
  // The full active-experiences list is requested on every homepage load and
  // changes infrequently, so cache it briefly to avoid re-querying/re-grouping
  // on every request.
  private categoriesCache: { value: ExperienceCategoryDto[]; expiresAt: number } | null = null;
  private readonly CATEGORIES_CACHE_TTL_MS = 60 * 1000;

  constructor(
    @InjectRepository(ExperienceTemplate)
    private readonly experienceTemplateRepository: Repository<ExperienceTemplate>,
    @InjectRepository(ExperienceImage)
    private readonly experienceImageRepository: Repository<ExperienceImage>,
  ) {}

  async getAllExperiences(): Promise<ExperienceCategoryDto[]> {
    if (this.categoriesCache && this.categoriesCache.expiresAt > Date.now()) {
      return this.categoriesCache.value;
    }

    // Get all active experiences with their images
    const experiences = await this.experienceTemplateRepository
      .createQueryBuilder('et')
      .leftJoinAndSelect('et.images', 'ei')
      .leftJoinAndSelect('et.company', 'c')
      .where('et.isActive = :isActive', { isActive: true })
      .orderBy('et.createdAt', 'DESC')
      .getMany();

    // Group experiences by category (using city as category for now)
    const categoriesMap = new Map<string, ExperienceTemplate[]>();
    
    experiences.forEach(experience => {
      const category = this.getCategoryFromExperience(experience);
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }
      categoriesMap.get(category)!.push(experience);
    });

    // Transform to DTO format
    const categories: ExperienceCategoryDto[] = [];
    categoriesMap.forEach((experiences, categoryTitle) => {
      const deals = experiences.map(exp => this.transformToCardDto(exp));
      categories.push({
        title: categoryTitle,
        deals,
      });
    });

    this.categoriesCache = { value: categories, expiresAt: Date.now() + this.CATEGORIES_CACHE_TTL_MS };
    return categories;
  }

  async getExperienceById(id: number): Promise<ExperienceDetailDto> {
    const experience = await this.experienceTemplateRepository
      .createQueryBuilder('et')
      .leftJoinAndSelect('et.images', 'ei')
      .leftJoinAndSelect('et.company', 'c')
      .where('et.id = :id', { id })
      .andWhere('et.isActive = :isActive', { isActive: true })
      .orderBy('ei.sortOrder', 'ASC')
      .getOne();

    if (!experience) {
      throw new NotFoundException(`Experience with ID ${id} not found`);
    }

    return this.transformToDetailDto(experience);
  }

  async getExperiencesByCategory(category: string): Promise<ExperienceCardDto[]> {
    const experiences = await this.experienceTemplateRepository
      .createQueryBuilder('et')
      .leftJoinAndSelect('et.images', 'ei')
      .leftJoinAndSelect('et.company', 'c')
      .where('et.isActive = :isActive', { isActive: true })
      .andWhere('et.city LIKE :category OR et.country LIKE :category', { 
        category: `%${category}%` 
      })
      .orderBy('et.createdAt', 'DESC')
      .getMany();

    return experiences.map(exp => this.transformToCardDto(exp));
  }

  async getExperienceAvailability(id: number): Promise<any> {
    const experience = await this.experienceTemplateRepository.findOne({
      where: { id, isActive: true },
    });

    if (!experience) {
      throw new NotFoundException(`Experience with ID ${id} not found`);
    }

    return {
      id: experience.id,
      title: experience.title,
      durationMinutes: experience.durationMinutes,
      total: experience.total,
      subTotal: experience.subTotal,
      taxAmount: experience.taxAmount,
      taxType: experience.taxType,
      isAvailable: experience.isActive,
    };
  }

  private getCategoryFromExperience(experience: ExperienceTemplate): string {
    // Map experiences to categories based on title or location
    const title = experience.title.toLowerCase();
    const city = experience.city.toLowerCase();
    
    if (title.includes('helicopter') || title.includes('aerial') || title.includes('skyline')) {
      return 'Aerial Sightseeing Tours';
    } else if (title.includes('ski') || title.includes('snow')) {
      return 'Heli Skiing';
    } else if (title.includes('fish') || title.includes('fishing')) {
      return 'Fishing';
    } else if (title.includes('wine') || title.includes('dine') || title.includes('restaurant')) {
      return 'Fly and Dine';
    } else if (title.includes('skydive') || title.includes('parachute')) {
      return 'Skydiving';
    } else if (title.includes('hike') || title.includes('trek') || title.includes('mountain')) {
      return 'Hiking';
    } else if (title.includes('surf') || title.includes('wave')) {
      return 'Surfing';
    } else if (title.includes('romantic') || title.includes('sunset') || title.includes('couple')) {
      return 'Romantic';
    } else if (title.includes('northern lights') || title.includes('aurora') || title.includes('seasonal')) {
      return 'Seasonal';
    } else {
      return 'Adventure Tours';
    }
  }

  private transformToCardDto(experience: ExperienceTemplate): ExperienceCardDto {
    // Get the first image (main image)
    const mainImage = experience.images?.find(img => img.imageSlot === 'image1') || 
                     experience.images?.[0];
    
    // Calculate average rating (placeholder for now)
    const rating = '4.8';
    
    return {
      id: experience.id,
      imageUrl: mainImage?.url || 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      title: experience.title,
      location: `${experience.city}, ${experience.country}`,
      duration: `${experience.durationMinutes} minutes`,
      price: `$${experience.total}`,
      rating,
    };
  }

  private transformToDetailDto(experience: ExperienceTemplate): ExperienceDetailDto {
    return {
      id: experience.id,
      title: experience.title,
      description: experience.description,
      country: experience.country,
      city: experience.city,
      locationName: experience.locationName,
      taxType: experience.taxType,
      taxAmount: experience.taxAmount,
      subTotal: experience.subTotal,
      total: experience.total,
      durationMinutes: experience.durationMinutes,
      termsConditions: experience.termsConditions || '',
      images: experience.images?.map(img => ({
        id: img.id,
        imageSlot: img.imageSlot,
        url: img.url,
        sortOrder: img.sortOrder,
      })) || [],
      createdAt: experience.createdAt,
      updatedAt: experience.updatedAt,
    };
  }
}
