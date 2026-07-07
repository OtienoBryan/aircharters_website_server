import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ExperienceTemplate } from '../../common/entities/experience-template.entity';
import { ExperienceImage } from '../../common/entities/experience-image.entity';
import { ExperienceSchedule } from '../../common/entities/experience-schedule.entity';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { AircraftImage } from '../../common/entities/aircraft-image.entity';
import { Booking, BookingType, BookingStatus, PaymentStatus } from '../../common/entities/booking.entity';
import { User } from '../../common/entities/user.entity';
import { ExperienceCardDto, ExperienceCategoryDto, ExperienceDetailDto, ExperienceScheduleDto } from './dto/experience-response.dto';
import { RequestExperienceQuoteDto } from './dto/request-experience-quote.dto';
import { EmailService } from '../email/email.service';

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
    @InjectRepository(ExperienceSchedule)
    private readonly experienceScheduleRepository: Repository<ExperienceSchedule>,
    @InjectRepository(Aircraft)
    private readonly aircraftRepository: Repository<Aircraft>,
    @InjectRepository(AircraftImage)
    private readonly aircraftImageRepository: Repository<AircraftImage>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  // Books interest in an experience without picking one of its scheduled
  // slots - creates a pending booking (no price, no schedule) for the
  // operator to quote, mirroring the direct-charter request-quote flow.
  async requestQuote(dto: RequestExperienceQuoteDto, userId: string) {
    const template = await this.experienceTemplateRepository
      .createQueryBuilder('et')
      .leftJoinAndSelect('et.company', 'c')
      .where('et.id = :id', { id: dto.experienceTemplateId })
      .andWhere('et.isActive = :isActive', { isActive: true })
      .getOne();

    if (!template) {
      throw new NotFoundException(`Experience with ID ${dto.experienceTemplateId} not found`);
    }
    if (template.company?.status !== 'active') {
      throw new BadRequestException('This experience is not currently accepting bookings.');
    }

    const referenceNumber = `AC${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const locationName = template.locationName || `${template.city || ''}, ${template.country || ''}`.trim();
    const now = new Date();

    // If the experience already has a set price, skip the "awaiting quote"
    // step entirely - the booking is payable immediately via the standard
    // /bookings/:id/create-payment-intent flow.
    const hasSetPrice = Number(template.total) > 0;

    const booking = this.bookingRepository.create({
      userId,
      companyId: template.companyId,
      bookingType: BookingType.EXPERIENCE,
      experienceTemplateId: template.id,
      experienceScheduleId: null,
      dealId: null,
      totalPrice: hasSetPrice ? Number(template.total) : null,
      bookingStatus: hasSetPrice ? BookingStatus.PRICED : BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      referenceNumber,
      specialRequirements: dto.specialRequests || null,
      originName: locationName,
      destinationName: locationName,
      departureDateTime: new Date(dto.preferredDateTime),
      totalAdults: dto.passengerCount,
      totalChildren: 0,
      onboardDining: false,
      createdAt: now,
      updatedAt: now,
    });

    const savedArr = await this.bookingRepository.save(booking);
    const savedBooking = Array.isArray(savedArr) ? savedArr[0] : savedArr;

    // Only a still-pending quote request needs the "please post a price"
    // notifications - a priced booking goes straight to payment, and the
    // existing payment-confirmation emails cover that once it's paid.
    if (!hasSetPrice) {
      try {
        const user = await this.dataSource.manager.findOne(User, {
          where: { id: userId },
          select: ['id', 'first_name', 'last_name', 'email'],
        });
        if (user) {
          await this.sendQuoteRequestNotifications(savedBooking, template, user, dto);
        }
      } catch (notificationError) {
        console.error('Failed to send experience quote request notifications:', notificationError);
      }
    }

    return {
      booking: {
        id: savedBooking.id,
        referenceNumber,
        bookingStatus: savedBooking.bookingStatus,
        paymentStatus: savedBooking.paymentStatus,
        totalPrice: savedBooking.totalPrice,
      },
      message: hasSetPrice
        ? 'Booking created. Continue to payment to confirm your spot.'
        : 'Quote request submitted. Our team will review your request and send a price shortly.',
    };
  }

  private async sendQuoteRequestNotifications(
    booking: Booking,
    template: ExperienceTemplate,
    user: User,
    dto: RequestExperienceQuoteDto,
  ): Promise<void> {
    const clientName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Traveler';
    const departureLabel = booking.departureDateTime ? new Date(booking.departureDateTime).toLocaleString() : 'TBA';
    const locationName = booking.originName || template.locationName || template.city;

    if (user.email) {
      await this.emailService.sendQuoteRequestConfirmationToClient(user.email, {
        referenceNumber: booking.referenceNumber,
        bookingType: 'Experience',
        clientName,
        originName: locationName,
        destinationName: locationName,
        departureDateTime: departureLabel,
        aircraftName: template.title,
      });
    }

    if (template.company?.email) {
      await this.emailService.sendQuoteRequestNotificationToOperator(template.company.email, {
        referenceNumber: booking.referenceNumber,
        bookingType: 'Experience',
        clientName,
        originName: locationName,
        destinationName: locationName,
        departureDateTime: departureLabel,
        passengerCount: dto.passengerCount,
        aircraftName: template.title,
        specialRequests: dto.specialRequests,
      });
    }
  }

  // Schedules only carry an aircraftId; look up each aircraft's name and
  // first image in one batched query instead of one query per schedule.
  private async getAircraftInfoByIds(aircraftIds: number[]): Promise<Map<number, { name: string; imageUrl: string | null }>> {
    const uniqueIds = [...new Set(aircraftIds.filter((id): id is number => id != null))];
    const info = new Map<number, { name: string; imageUrl: string | null }>();
    if (uniqueIds.length === 0) return info;

    const aircraft = await this.aircraftRepository
      .createQueryBuilder('a')
      .where('a.id IN (:...ids)', { ids: uniqueIds })
      .select(['a.id', 'a.name'])
      .getMany();

    const images = await this.aircraftImageRepository
      .createQueryBuilder('img')
      .where('img.aircraftId IN (:...ids)', { ids: uniqueIds })
      .orderBy('img.id', 'ASC')
      .getMany();

    const firstImageByAircraftId = new Map<number, string>();
    for (const image of images) {
      if (!firstImageByAircraftId.has(image.aircraftId)) {
        firstImageByAircraftId.set(image.aircraftId, image.url);
      }
    }

    for (const ac of aircraft) {
      info.set(ac.id, { name: ac.name, imageUrl: firstImageByAircraftId.get(ac.id) || null });
    }
    return info;
  }

  // Schedules are the bookable instances of a template; pick the earliest
  // upcoming-or-scheduled one per experience so cards reflect real
  // availability/pricing instead of the template's static placeholder values.
  private async getNextSchedulesByExperienceId(): Promise<Map<number, ExperienceSchedule>> {
    const schedules = await this.experienceScheduleRepository
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'scheduled' })
      .orderBy('s.startTime', 'ASC')
      .getMany();

    const nextByExperienceId = new Map<number, ExperienceSchedule>();
    for (const schedule of schedules) {
      if (!nextByExperienceId.has(schedule.experienceId)) {
        nextByExperienceId.set(schedule.experienceId, schedule);
      }
    }
    return nextByExperienceId;
  }

  // Total count of scheduled (bookable) tours per experience, for display on
  // the listing cards.
  private async getScheduledCountsByExperienceId(): Promise<Map<number, number>> {
    const rows = await this.experienceScheduleRepository
      .createQueryBuilder('s')
      .select('s.experienceId', 'experienceId')
      .addSelect('COUNT(*)', 'count')
      .where('s.status = :status', { status: 'scheduled' })
      .groupBy('s.experienceId')
      .getRawMany();

    const countsByExperienceId = new Map<number, number>();
    for (const row of rows) {
      countsByExperienceId.set(Number(row.experienceId), Number(row.count));
    }
    return countsByExperienceId;
  }

  async getAllExperiences(): Promise<ExperienceCategoryDto[]> {
    if (this.categoriesCache && this.categoriesCache.expiresAt > Date.now()) {
      return this.categoriesCache.value;
    }

    // Get all active experiences with their images
    const [experiences, nextScheduleByExperienceId, scheduledCountByExperienceId] = await Promise.all([
      this.experienceTemplateRepository
        .createQueryBuilder('et')
        .leftJoinAndSelect('et.images', 'ei')
        .leftJoinAndSelect('et.company', 'c')
        .where('et.isActive = :isActive', { isActive: true })
        .andWhere('c.status = :companyStatus', { companyStatus: 'active' })
        // Priority starts at 1 (lower = shown first); 0 means "not set" and
        // those companies fall to the end, same convention as the fleet listing.
        .orderBy('CASE WHEN c.priority = 0 THEN 1 ELSE 0 END', 'ASC')
        .addOrderBy('c.priority', 'ASC')
        .addOrderBy('et.createdAt', 'DESC')
        .getMany(),
      this.getNextSchedulesByExperienceId(),
      this.getScheduledCountsByExperienceId(),
    ]);

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
      const deals = experiences.map(exp => this.transformToCardDto(
        exp,
        nextScheduleByExperienceId.get(exp.id),
        scheduledCountByExperienceId.get(exp.id) ?? 0,
      ));
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
    const [experiences, nextScheduleByExperienceId, scheduledCountByExperienceId] = await Promise.all([
      this.experienceTemplateRepository
        .createQueryBuilder('et')
        .leftJoinAndSelect('et.images', 'ei')
        .leftJoinAndSelect('et.company', 'c')
        .where('et.isActive = :isActive', { isActive: true })
        .andWhere('et.city LIKE :category OR et.country LIKE :category', {
          category: `%${category}%`
        })
        .orderBy('et.createdAt', 'DESC')
        .getMany(),
      this.getNextSchedulesByExperienceId(),
      this.getScheduledCountsByExperienceId(),
    ]);

    return experiences.map(exp => this.transformToCardDto(
      exp,
      nextScheduleByExperienceId.get(exp.id),
      scheduledCountByExperienceId.get(exp.id) ?? 0,
    ));
  }

  async getSchedulesByExperienceId(experienceId: number): Promise<ExperienceScheduleDto[]> {
    // Use a raw YYYY-MM-DD string (not a JS Date) so mysql2 doesn't re-serialize
    // it through the server's local timezone, which would shift the cutoff
    // and drop today's schedules (same class of bug fixed in charter-deals).
    const todayStr = new Date().toISOString().slice(0, 10);

    const schedules = await this.experienceScheduleRepository
      .createQueryBuilder('s')
      .where('s.experienceId = :experienceId', { experienceId })
      .andWhere('s.status = :status', { status: 'scheduled' })
      .andWhere('s.startTime >= :todayStr', { todayStr })
      .orderBy('s.startTime', 'ASC')
      .getMany();

    const aircraftInfoById = await this.getAircraftInfoByIds(schedules.map(s => s.aircraftId));

    return schedules.map(s => {
      const aircraftInfo = s.aircraftId ? aircraftInfoById.get(s.aircraftId) : undefined;
      return {
        id: s.id,
        experienceId: s.experienceId,
        aircraftId: s.aircraftId,
        aircraftName: aircraftInfo?.name,
        aircraftImageUrl: aircraftInfo?.imageUrl ?? undefined,
        startTime: s.startTime,
        endTime: s.endTime,
        priceUnit: s.priceUnit,
        durationMinutes: s.durationMinutes,
        seatsAvailable: s.seatsAvailable,
        status: s.status,
        taxType: s.taxType,
        subTotal: s.subTotal,
        total: s.total,
        taxAmount: s.taxAmount,
      };
    });
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

  private transformToCardDto(experience: ExperienceTemplate, schedule?: ExperienceSchedule, scheduledToursCount: number = 0): ExperienceCardDto {
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
      duration: `${schedule?.durationMinutes ?? experience.durationMinutes} minutes`,
      price: `$${schedule?.total ?? experience.total}`,
      rating,
      seatsAvailable: schedule?.seatsAvailable,
      startTime: schedule?.startTime,
      priceUnit: schedule?.priceUnit,
      scheduledToursCount,
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
