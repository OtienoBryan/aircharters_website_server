import { Injectable, BadRequestException } from '@nestjs/common';
import { PassengerDto } from '../dto/passenger.dto';

@Injectable()
export class PassengerValidationService {
  
  /**
   * Validate passenger requirements based on flight type and destination
   */
  validatePassengerRequirements(
    passengers: PassengerDto[], 
    origin: string, 
    destination: string,
    expectedPassengerCount: number
  ): void {
    console.log('=== PASSENGER VALIDATION SERVICE ===');
    console.log('Expected passengers:', expectedPassengerCount);
    console.log('Received passengers:', passengers.length);
    console.log('Flight route:', `${origin} → ${destination}`);

    // Validate passenger count matches
    if (passengers.length !== expectedPassengerCount) {
      throw new BadRequestException(
        `Expected ${expectedPassengerCount} passengers, but received ${passengers.length}`
      );
    }

    // Check if this is an international flight
    const isInternationalFlight = this.isInternationalFlight(origin, destination);
    console.log('International flight:', isInternationalFlight);

    // Validate each passenger
    passengers.forEach((passenger, index) => {
      this.validateIndividualPassenger(passenger, index + 1, isInternationalFlight);
    });

    // Validate at least one passenger is marked as user
    const userPassengers = passengers.filter(p => p.isUser);
    if (userPassengers.length === 0) {
      throw new BadRequestException('At least one passenger must be marked as the booking user');
    }

    if (userPassengers.length > 1) {
      throw new BadRequestException('Only one passenger can be marked as the booking user');
    }

    console.log('All passenger validations passed');
  }

  /**
   * Validate individual passenger data
   */
  private validateIndividualPassenger(
    passenger: PassengerDto, 
    passengerNumber: number,
    isInternationalFlight: boolean
  ): void {
    const errors: string[] = [];

    // Required field validations
    if (!passenger.firstName || passenger.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!passenger.lastName || passenger.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!passenger.nationality || passenger.nationality.trim().length === 0) {
      errors.push('Nationality is required');
    }

    // Age validation
    if (!passenger.age || passenger.age < 0 || passenger.age > 150) {
      errors.push('Valid age (0-150) is required');
    }

    // International flight specific validations
    if (isInternationalFlight) {
      if (!passenger.idPassportNumber || passenger.idPassportNumber.trim().length === 0) {
        errors.push('Passport/ID number is required for international flights');
      }
    }

    // Name length validations
    if (passenger.firstName && passenger.firstName.length > 100) {
      errors.push('First name must be 100 characters or less');
    }

    if (passenger.lastName && passenger.lastName.length > 100) {
      errors.push('Last name must be 100 characters or less');
    }

    if (passenger.nationality && passenger.nationality.length > 100) {
      errors.push('Nationality must be 100 characters or less');
    }

    if (passenger.idPassportNumber && passenger.idPassportNumber.length > 100) {
      errors.push('Passport/ID number must be 100 characters or less');
    }

    // Special validations for children
    if (passenger.age && passenger.age < 2) {
      console.log(`Passenger ${passengerNumber}: Infant detected (age: ${passenger.age})`);
      // Infants might have special requirements in the future
    } else if (passenger.age && passenger.age < 18) {
      console.log(`Passenger ${passengerNumber}: Minor detected (age: ${passenger.age})`);
      // Minors might need guardian information in the future
    }

    // Throw error if any validation failed
    if (errors.length > 0) {
      throw new BadRequestException(
        `Passenger ${passengerNumber} validation failed: ${errors.join(', ')}`
      );
    }
  }

  /**
   * Determine if a flight is international based on origin and destination
   */
  private isInternationalFlight(origin: string, destination: string): boolean {
    // List of domestic airports in Kenya
    const kenyanAirports = [
      'jomo kenyatta international airport',
      'wilson airport',
      'moi international airport',
      'kisumu airport',
      'eldoret airport',
      'malindi airport',
      'lamu airport',
      'ukunda airport',
      'diani airport',
      'nairobi',
      'mombasa',
      'kisumu',
      'eldoret',
      'malindi',
      'lamu',
      'diani',
      'ukunda',
      // Add more Kenyan airports as needed
    ];

    const originLower = origin.toLowerCase();
    const destinationLower = destination.toLowerCase();

    // Check if both origin and destination are Kenyan airports
    const isOriginKenyan = kenyanAirports.some(airport => 
      originLower.includes(airport) || airport.includes(originLower));
    const isDestinationKenyan = kenyanAirports.some(airport => 
      destinationLower.includes(airport) || airport.includes(destinationLower));

    // If both are Kenyan airports, it's domestic; otherwise international
    return !(isOriginKenyan && isDestinationKenyan);
  }

  /**
   * Get passenger age category
   */
  getPassengerAgeCategory(age: number): 'infant' | 'child' | 'adult' {
    if (age < 2) return 'infant';
    if (age < 12) return 'child';
    return 'adult';
  }

  /**
   * Validate passenger count against aircraft capacity
   */
  validatePassengerCapacity(passengerCount: number, aircraftCapacity: number): void {
    if (passengerCount > aircraftCapacity) {
      throw new BadRequestException(
        `Passenger count (${passengerCount}) exceeds aircraft capacity (${aircraftCapacity})`
      );
    }

    if (passengerCount <= 0) {
      throw new BadRequestException('At least one passenger is required');
    }
  }

  /**
   * Format passenger data for database insertion
   */
  formatPassengerForDatabase(passenger: PassengerDto, bookingId: number) {
    return {
      booking_id: bookingId,
      first_name: passenger.firstName.trim(),
      last_name: passenger.lastName.trim(),
      age: passenger.age,
      nationality: passenger.nationality.trim(),
      id_passport_number: passenger.idPassportNumber?.trim() || null,
      is_user: passenger.isUser || false,
    };
  }
}
