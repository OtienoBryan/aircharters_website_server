import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AircraftService } from './aircraft.service';

@ApiTags('Aircraft')
@Controller('aircraft')
export class AircraftController {
  constructor(private readonly aircraftService: AircraftService) {}

  @Get()
  @ApiOperation({ summary: 'Get available aircraft, optionally filtered by type' })
  @ApiQuery({ name: 'type', required: false, description: 'Aircraft type enum value (e.g. jet, helicopter)' })
  @ApiResponse({ status: 200, description: 'Returns list of available aircraft' })
  async getAircraft(@Query('type') type?: string) {
    try {
      const aircraft = type ? await this.aircraftService.findByType(type) : [];
      return {
        success: true,
        data: aircraft,
        message: `Found ${aircraft.length} aircraft`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch aircraft',
        data: [],
      };
    }
  }
}
