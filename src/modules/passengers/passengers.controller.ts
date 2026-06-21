import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PassengersService } from './passengers.service';
import { CreatePassengerDto, UpdatePassengerDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Passengers')
@Controller('passengers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PassengersController {
  constructor(private readonly passengersService: PassengersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new passenger' })
  @ApiResponse({
    status: 201,
    description: 'Passenger created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            bookingId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            age: { type: 'number', nullable: true },
            nationality: { type: 'string', nullable: true },
            idPassportNumber: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            fullName: { type: 'string' },
            displayName: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createPassengerDto: CreatePassengerDto) {
    const passenger = await this.passengersService.create(createPassengerDto);
    return {
      success: true,
      message: 'Passenger created successfully',
      data: passenger,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all passengers' })
  @ApiResponse({
    status: 200,
    description: 'Passengers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              bookingId: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              age: { type: 'number', nullable: true },
              nationality: { type: 'string', nullable: true },
              idPassportNumber: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              fullName: { type: 'string' },
              displayName: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async findAll() {
    const passengers = await this.passengersService.findAll();
    return {
      success: true,
      message: 'Passengers retrieved successfully',
      data: passengers,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get passenger by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Passenger ID' })
  @ApiResponse({
    status: 200,
    description: 'Passenger retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            bookingId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            age: { type: 'number', nullable: true },
            nationality: { type: 'string', nullable: true },
            idPassportNumber: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            fullName: { type: 'string' },
            displayName: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Passenger not found' })
  async findOne(@Param('id') id: string) {
    const passenger = await this.passengersService.findOne(+id);
    return {
      success: true,
      message: 'Passenger retrieved successfully',
      data: passenger,
    };
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get passengers by booking ID' })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Passengers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              bookingId: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              age: { type: 'number', nullable: true },
              nationality: { type: 'string', nullable: true },
              idPassportNumber: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              fullName: { type: 'string' },
              displayName: { type: 'string' },
            },
          },
        },
        count: { type: 'number' },
      },
    },
  })
  async findByBookingId(@Param('bookingId') bookingId: string) {
    const passengers = await this.passengersService.findByBookingId(+bookingId);
    return {
      success: true,
      message: 'Passengers retrieved successfully',
      data: passengers,
      count: passengers.length,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update passenger by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Passenger ID' })
  @ApiResponse({
    status: 200,
    description: 'Passenger updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            bookingId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            age: { type: 'number', nullable: true },
            nationality: { type: 'string', nullable: true },
            idPassportNumber: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            fullName: { type: 'string' },
            displayName: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Passenger not found' })
  async update(@Param('id') id: string, @Body() updatePassengerDto: UpdatePassengerDto) {
    const passenger = await this.passengersService.update(+id, updatePassengerDto);
    return {
      success: true,
      message: 'Passenger updated successfully',
      data: passenger,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete passenger by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Passenger ID' })
  @ApiResponse({ status: 204, description: 'Passenger deleted successfully' })
  @ApiResponse({ status: 404, description: 'Passenger not found' })
  async remove(@Param('id') id: string) {
    await this.passengersService.remove(+id);
  }

  @Delete('booking/:bookingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all passengers for a booking' })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 204, description: 'Passengers deleted successfully' })
  async removeByBookingId(@Param('bookingId') bookingId: string) {
    await this.passengersService.removeByBookingId(+bookingId);
  }
} 