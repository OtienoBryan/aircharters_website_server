import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Passenger } from '../../common/entities/passenger.entity';
import { CreatePassengerDto, UpdatePassengerDto } from './dto';

@Injectable()
export class PassengersService {
  constructor(
    @InjectRepository(Passenger)
    private passengerRepository: Repository<Passenger>,
  ) {}

  async create(createPassengerDto: CreatePassengerDto): Promise<Passenger> {
    const passenger = this.passengerRepository.create(createPassengerDto);
    return await this.passengerRepository.save(passenger);
  }

  async findAll(): Promise<Passenger[]> {
    return await this.passengerRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Passenger> {
    const passenger = await this.passengerRepository.findOne({
      where: { id },
    });
    
    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${id} not found`);
    }
    
    return passenger;
  }

  async findByBookingId(bookingId: number): Promise<Passenger[]> {
    return await this.passengerRepository.find({
      where: { booking_id: bookingId },
      order: { created_at: 'ASC' },
    });
  }

  async update(id: number, updatePassengerDto: UpdatePassengerDto): Promise<Passenger> {
    await this.passengerRepository.update(id, updatePassengerDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.passengerRepository.delete(id);
  }

  async removeByBookingId(bookingId: number): Promise<void> {
    await this.passengerRepository.delete({ booking_id: bookingId });
  }

  async countByBookingId(bookingId: number): Promise<number> {
    return await this.passengerRepository.count({
      where: { booking_id: bookingId },
    });
  }
} 