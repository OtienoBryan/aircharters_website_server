import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull, MoreThanOrEqual, In } from 'typeorm';
import { Aircraft } from '../../common/entities/aircraft.entity';
import { Location } from '../../common/entities/location.entity';
import { ChartersCompany } from '../../common/entities/charters-company.entity';
import { CharterDeal } from '../../common/entities/charter-deal.entity';
import { Booking } from '../../common/entities/booking.entity';
import { AircraftImage } from '../../common/entities/aircraft-image.entity';
import { AircraftCalendar, CalendarEventType } from '../../common/entities/aircraft-calendar.entity';
import { AircraftAvailabilitySearchDto, AvailableAircraftDto } from './dto/aircraft-availability.dto';

// ... existing code ...

@Injectable()
export class AircraftAvailabilityService {
  constructor(
    @InjectRepository(Aircraft)
    private readonly aircraftRepository: Repository<Aircraft>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(ChartersCompany)
    private readonly companyRepository: Repository<ChartersCompany>,
    @InjectRepository(CharterDeal)
    private readonly charterDealRepository: Repository<CharterDeal>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(AircraftImage)
    private readonly aircraftImageRepository: Repository<AircraftImage>,
    @InjectRepository(AircraftCalendar)
    private readonly aircraftCalendarRepository: Repository<AircraftCalendar>,
  ) {}

  /**
   * Search for available aircraft for a specific route and date
   */
  async searchAvailableAircraft(searchDto: AircraftAvailabilitySearchDto): Promise<AvailableAircraftDto[]> {
    try {
      const { departureLocationId, arrivalLocationId, departureDate, returnDate, passengerCount, isRoundTrip } = searchDto;

      // Convert string dates to Date objects
      const departureDateObj = new Date(departureDate);
      const returnDateObj = returnDate ? new Date(returnDate) : undefined;

      // Get departure and arrival locations
      const departureLocation = await this.locationRepository.findOne({ where: { id: departureLocationId } });
      const arrivalLocation = await this.locationRepository.findOne({ where: { id: arrivalLocationId } });

      if (!departureLocation || !arrivalLocation) {
        throw new BadRequestException('Invalid departure or arrival location');
      }

      // Get all aircraft that meet capacity requirements
      const aircraft = await this.aircraftRepository
        .createQueryBuilder('aircraft')
        .leftJoinAndSelect('aircraft.company', 'company')
        .where('aircraft.capacity >= :passengerCount', { passengerCount })
        .andWhere('aircraft.isAvailable = :isAvailable', { isAvailable: true })
        .andWhere('aircraft.maintenanceStatus = :maintenanceStatus', { maintenanceStatus: 'operational' })
        .getMany();

      const availableAircraft: AvailableAircraftDto[] = [];

      for (const aircraftItem of aircraft) {
        try {
          // Check if aircraft is available for the requested date
          const isAvailable = await this.isAircraftAvailableForDate(
            aircraftItem.id,
            departureDateObj,
            passengerCount
          );

          if (!isAvailable) continue;

          // Check availability for return date if round trip
          if (isRoundTrip && returnDateObj) {
            const isAvailableReturn = await this.isAircraftAvailableForDate(
              aircraftItem.id,
              returnDateObj,
              passengerCount
            );

            if (!isAvailableReturn) continue;
          }

          // Calculate pricing and flight details
          const flightDetails = await this.calculateFlightDetails(
            aircraftItem,
            departureLocation,
            arrivalLocation,
            departureDateObj
          );

          if (flightDetails) {
            // Ensure all properties are properly defined to avoid serialization issues
            const aircraftDto: AvailableAircraftDto = {
              aircraftId: aircraftItem.id || 0,
              aircraftName: aircraftItem.name || 'Unknown Aircraft',
              aircraftType: aircraftItem.type || 'fixedWing',
              capacity: aircraftItem.capacity || 0,
              companyId: aircraftItem.companyId || 0,
              companyName: aircraftItem.company?.companyName || 'Unknown Company',
              basePrice: flightDetails.basePrice || 0,
              repositioningCost: flightDetails.repositioningCost || 0,
              totalPrice: flightDetails.totalPrice || 0,
              availableSeats: (aircraftItem.capacity || 0) - passengerCount,
              departureTime: flightDetails.departureTime || '09:00:00',
              arrivalTime: flightDetails.arrivalTime || '10:00:00',
              flightDuration: flightDetails.duration || 60,
              distance: flightDetails.distance || 0,
              amenities: flightDetails.amenities || ['Comfortable Seating'],
              images: flightDetails.images || ['https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Aircraft'],
            };
            
            availableAircraft.push(aircraftDto);
          }
        } catch (error) {
          console.error(`Error processing aircraft ${aircraftItem.id}:`, error);
          // Continue with next aircraft instead of failing completely
          continue;
        }
      }

      // Sort aircraft by price (lowest first)
      return availableAircraft.sort((a, b) => a.totalPrice - b.totalPrice);
    } catch (error) {
      console.error('Error in searchAvailableAircraft:', error);
      throw error;
    }
  }

  /**
   * Check if an aircraft is available for a specific date
   */
  async isAircraftAvailableForDate(
    aircraftId: number,
    date: Date,
    passengerCount: number
  ): Promise<boolean> {
    // Check if aircraft exists and is operational
    const aircraft = await this.aircraftRepository.findOne({ 
      where: { 
        id: aircraftId,
        isAvailable: true,
        maintenanceStatus: 'operational'
      } 
    });

    if (!aircraft) return false;

    // Check if aircraft has enough capacity for the requested passenger count
    if (aircraft.capacity < passengerCount) return false;

    // Check for calendar conflicts (bookings, maintenance, blocked periods)
    const conflicts = await this.aircraftCalendarRepository.find({
      where: {
        aircraftId,
        eventType: In([CalendarEventType.BOOKED, CalendarEventType.MAINTENANCE, CalendarEventType.BLOCKED]),
        startDateTime: Between(
          new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
          new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        ),
      },
    });

    // If there are conflicts, aircraft is not available
    return conflicts.length === 0;
  }

  /**
   * Get aircraft availability for a date range
   */
  async getAircraftAvailability(
    aircraftId: number,
    startDate: Date,
    endDate: Date
  ) {
    const aircraft = await this.aircraftRepository.findOne({
      where: { id: aircraftId },
      relations: ['company'],
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    // Get all calendar events for the aircraft in the date range
    const events = await this.aircraftCalendarRepository.find({
      where: {
        aircraftId,
        startDateTime: Between(startDate, endDate),
      },
      order: { startDateTime: 'ASC' },
    });

    // Group events by date
    const availabilityByDate = {};
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayEvents = events.filter(event => 
        event.startDateTime.toISOString().split('T')[0] === dateKey
      );

      availabilityByDate[dateKey] = {
        date: new Date(currentDate),
        isAvailable: dayEvents.length === 0,
        events: dayEvents,
        status: dayEvents.length === 0 ? 'available' : 'unavailable',
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      success: true,
      data: {
        aircraft,
        availability: availabilityByDate,
        summary: {
          totalDays: Object.keys(availabilityByDate).length,
          availableDays: Object.values(availabilityByDate).filter((day: any) => day.isAvailable).length,
          unavailableDays: Object.values(availabilityByDate).filter((day: any) => !day.isAvailable).length,
        },
      },
    };
  }

  /**
   * Create calendar event for aircraft
   */
  async createCalendarEvent(
    aircraftId: number,
    eventType: CalendarEventType,
    startTime: Date,
    endTime: Date,
    description?: string
  ) {
    const aircraft = await this.aircraftRepository.findOne({
      where: { id: aircraftId },
    });

    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    // Check for conflicts before creating the event
    const conflicts = await this.aircraftCalendarRepository.find({
      where: {
        aircraftId,
        startDateTime: Between(startTime, endTime),
        eventType: In([CalendarEventType.BOOKED, CalendarEventType.MAINTENANCE, CalendarEventType.BLOCKED]),
      },
    });

    if (conflicts.length > 0) {
      throw new BadRequestException('Aircraft is not available for the specified time period');
    }

    const calendarEvent = this.aircraftCalendarRepository.create({
      aircraftId,
      eventType,
      startDateTime: startTime,
      endDateTime: endTime,
    });

    return await this.aircraftCalendarRepository.save(calendarEvent);
  }

  /**
   * Calculate flight details including pricing and timing
   */
  private async calculateFlightDetails(
    aircraft: Aircraft,
    departureLocation: Location,
    arrivalLocation: Location,
    departureDate: Date
  ): Promise<any> {
    try {
      // Calculate distance
      const distance = this.calculateDistance(departureLocation, arrivalLocation);

      // Calculate flight duration (rough estimation: 800 km/h average speed)
      const durationHours = distance / 800;
      const durationMinutes = Math.round(durationHours * 60);

      // Calculate base price using price_per_hour from aircraft table
      const pricePerHour = aircraft.pricePerHour || this.getDefaultPricePerHour(aircraft.type);
      const basePrice = durationHours * pricePerHour;

      // Check if repositioning is needed
      const repositioningCost = await this.calculateRepositioningCost(
        aircraft.id,
        departureLocation.id,
        arrivalLocation.id,
        departureDate
      );

      const totalPrice = basePrice + (repositioningCost || 0);

      // Generate departure and arrival times
      const departureTime = '09:00:00'; // Default departure time
      const arrivalTime = this.addMinutesToTime(departureTime, durationMinutes);

      // Get aircraft amenities and real images
      const amenities = this.getAircraftAmenities(aircraft.type);
      const images = await this.getAircraftImages(aircraft.id);

      return {
        basePrice,
        repositioningCost,
        totalPrice,
        departureTime,
        arrivalTime,
        duration: durationMinutes,
        distance,
        amenities,
        images,
      };
    } catch (error) {
      console.error('Error calculating flight details:', error);
      // Return a basic flight details object if calculation fails
      return {
        basePrice: 1000,
        repositioningCost: 0,
        totalPrice: 1000,
        departureTime: '09:00:00',
        arrivalTime: '10:00:00',
        duration: 60,
        distance: 800,
        amenities: ['Comfortable Seating'],
        images: ['https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Aircraft'],
      };
    }
  }

  /**
   * Calculate distance between two locations using Haversine formula
   */
  private calculateDistance(origin: Location, destination: Location): number {
    if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const lat1 = origin.latitude * (Math.PI / 180);
    const lat2 = destination.latitude * (Math.PI / 180);
    const deltaLat = (destination.latitude - origin.latitude) * (Math.PI / 180);
    const deltaLon = (destination.longitude - origin.longitude) * (Math.PI / 180);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get default price per hour based on aircraft type (fallback)
   */
  private getDefaultPricePerHour(aircraftType: string): number {
    const pricing = {
      'helicopter': 1500,
      'fixedWing': 800,
      'jet': 2500,
      'glider': 500,
      'seaplane': 1200,
      'ultralight': 300,
      'balloon': 2000,
      'tiltrotor': 3000,
      'gyroplane': 1000,
      'airship': 3500,
    };

    return pricing[aircraftType] || 1000;
  }

  /**
   * Calculate repositioning cost if aircraft needs to be moved
   */
  private async calculateRepositioningCost(
    aircraftId: number,
    departureLocationId: number,
    arrivalLocationId: number,
    departureDate: Date
  ): Promise<number | null> {
    try {
      // For now, calculate a simple repositioning cost based on distance
      // In a real system, this would check the aircraft's current location
      const departureLocation = await this.locationRepository.findOne({ 
        where: { id: departureLocationId } 
      });
      const arrivalLocation = await this.locationRepository.findOne({ 
        where: { id: arrivalLocationId } 
      });
      
      if (departureLocation && arrivalLocation) {
        const distance = this.calculateDistance(departureLocation, arrivalLocation);
        const aircraft = await this.aircraftRepository.findOne({ 
          where: { id: aircraftId } 
        });
        
        if (aircraft) {
          const pricePerHour = aircraft.pricePerHour || this.getDefaultPricePerHour(aircraft.type);
          const repositioningHours = distance / 800; // Same speed calculation
          const repositioningCost = repositioningHours * pricePerHour * 0.3; // 30% of normal rate for repositioning
          
          // Cap repositioning cost at 20% of base price
          const basePrice = repositioningHours * pricePerHour;
          return Math.min(repositioningCost, basePrice * 0.2);
        }
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating repositioning cost:', error);
      return 0;
    }
  }



  /**
   * Add minutes to time string
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins, secs] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get aircraft amenities based on type
   */
  private getAircraftAmenities(aircraftType: string): string[] {
    const amenities = {
      'helicopter': ['Air Conditioning', 'Comfortable Seating', 'Large Windows'],
      'fixedWing': ['Air Conditioning', 'Comfortable Seating', 'Refreshments'],
      'jet': ['Luxury Seating', 'WiFi', 'Refreshments', 'Entertainment', 'Air Conditioning'],
      'glider': ['Comfortable Seating', 'Large Windows'],
      'seaplane': ['Air Conditioning', 'Comfortable Seating', 'Refreshments'],
      'ultralight': ['Comfortable Seating', 'Large Windows'],
      'balloon': ['Comfortable Seating', 'Large Windows', 'Refreshments'],
      'tiltrotor': ['Luxury Seating', 'WiFi', 'Refreshments', 'Entertainment', 'Air Conditioning'],
      'gyroplane': ['Comfortable Seating', 'Large Windows'],
      'airship': ['Luxury Seating', 'WiFi', 'Refreshments', 'Entertainment', 'Air Conditioning'],
    };

    return amenities[aircraftType] || ['Comfortable Seating'];
  }

  /**
   * Get aircraft images from aircraft_images table
   */
  private async getAircraftImages(aircraftId: number): Promise<string[]> {
    try {
      // Fetch real aircraft images from the database
      const images = await this.aircraftImageRepository.find({
        where: { aircraftId },
        order: { id: 'ASC' },
        take: 5, // Limit to 5 images
      });

      // Return the image URLs, prioritizing exterior and interior images
      const imageUrls = images.map(img => img.url).filter(url => url != null);
      
      // If no images found, return placeholder images
      if (imageUrls.length === 0) {
        return [
          'https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Aircraft',
          'https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Interior',
        ];
      }

      return imageUrls;
    } catch (error) {
      console.error('Error fetching aircraft images:', error);
      // Return placeholder images if database query fails
      return [
        'https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Aircraft',
        'https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Interior',
      ];
    }
  }
} 