import { Controller, Post, Body, UseGuards, Request, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DirectCharterService } from './direct-charter.service';
import { SearchDirectCharterDto } from './dto/search-direct-charter.dto';
import { BookDirectCharterDto } from './dto/book-direct-charter.dto';

@ApiTags('Direct Charter')
@Controller('direct-charter')
export class DirectCharterController {
  constructor(private readonly directCharterService: DirectCharterService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search for available aircraft for direct charter' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns available aircraft sorted by priority and price' 
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async searchAvailableAircraft(@Body() searchDto: SearchDirectCharterDto) {
    try {
      const results = await this.directCharterService.searchAvailableAircraft(searchDto);
      return {
        success: true,
        data: results,
        message: `Found ${results.length} available aircraft`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to search for available aircraft',
        data: [],
      };
    }
  }

  @Post('book')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a direct charter flight' })
  @ApiResponse({ 
    status: 201, 
    description: 'Booking confirmed successfully' 
  })
  @ApiResponse({ status: 400, description: 'Aircraft not available or invalid booking data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bookDirectCharter(
    @Body() bookDto: BookDirectCharterDto,
    @Request() req: any
  ) {
    try {
      console.log('=== BACKEND: DIRECT CHARTER BOOKING REQUEST (with passengers) ===');
      console.log('Passenger payload types:', Array.isArray(bookDto.passengers), bookDto.passengers?.map(p => ({
        firstName: typeof p.firstName,
        lastName: typeof p.lastName,
        age: typeof p.age,
        nationality: typeof p.nationality,
        idPassportNumber: typeof p.idPassportNumber,
        isUser: typeof p.isUser,
      })));
    } catch (e) {}
    console.log('=== BACKEND: DIRECT CHARTER BOOKING REQUEST ===');
    console.log('User ID:', req.user.id);
    console.log('Request Body:', JSON.stringify(bookDto, null, 2));
    console.log('Request Headers:', req.headers);
    
    try {
      const userId = req.user.id;
      console.log('=== BACKEND: CALLING DIRECT CHARTER SERVICE ===');
      
      const result = await this.directCharterService.bookDirectCharter(bookDto, userId);
      
      console.log('=== BACKEND: BOOKING SUCCESS ===');
      console.log('Result:', JSON.stringify(result, null, 2));
      
      return {
        success: true,
        data: result,
        message: 'Direct charter booking confirmed successfully',
      };
    } catch (error) {
      console.log('=== BACKEND: BOOKING ERROR ===');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('Error Stack:', error.stack);
      
      return {
        success: false,
        message: error.message || 'Failed to book direct charter',
        data: null,
      };
    }
  }

  @Get('aircraft-types')
  @ApiOperation({ summary: 'Get all aircraft type placeholders' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns list of aircraft type placeholders with images' 
  })
  async getAircraftTypes() {
    try {
      const aircraftTypes = await this.directCharterService.getAircraftTypes();
      return {
        success: true,
        data: aircraftTypes,
        message: `Found ${aircraftTypes.length} aircraft types`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch aircraft types',
        data: [],
      };
    }
  }

  @Get('aircraft')
  @ApiOperation({ summary: 'Get available aircraft by type' })
  @ApiQuery({ name: 'typeId', required: false, description: 'Aircraft type ID to filter by' })
  @ApiQuery({ name: 'userLocation', required: false, description: 'User location for flight duration calculation' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns available aircraft of specified type' 
  })
  async getAircraftByType(@Query('typeId') typeId?: number, @Query('userLocation') userLocation?: string) {
    try {
      const aircraft = await this.directCharterService.getAircraftByType(typeId, userLocation);
      return {
        success: true,
        data: aircraft,
        message: `Found ${aircraft.length} available aircraft`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch aircraft',
        data: [],
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check direct charter service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      success: true,
      message: 'Direct charter service is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('aircraft/:aircraftId/booked-dates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booked dates for a specific aircraft' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns list of booked dates for the aircraft' 
  })
  @ApiResponse({ status: 404, description: 'Aircraft not found' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filtering (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for filtering (ISO string)' })
  async getBookedDates(
    @Param('aircraftId') aircraftId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const bookedDates = await this.directCharterService.getBookedDates(
        parseInt(aircraftId),
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      
      return {
        success: true,
        data: bookedDates.map(date => date.toISOString()),
        message: `Found ${bookedDates.length} booked dates`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch booked dates',
        data: [],
      };
    }
  }
} 