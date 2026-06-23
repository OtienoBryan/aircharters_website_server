import { Controller, Get, Param, ParseIntPipe, Query, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AircraftService } from './aircraft.service';

@ApiTags('Aircraft')
@Controller('aircraft')
export class AircraftController {
  constructor(private readonly aircraftService: AircraftService) {}

  @Get()
  @ApiOperation({ summary: 'Get aircraft, optionally filtered by type or serviceType. Without filters, returns the full fleet roster (including unavailable aircraft).' })
  @ApiQuery({ name: 'type', required: false, description: 'Aircraft type enum value (e.g. jet, helicopter)' })
  @ApiQuery({ name: 'serviceType', required: false, description: 'Aircraft service type enum value (cargo, medical)' })
  @ApiResponse({ status: 200, description: 'Returns list of aircraft' })
  // Matches AircraftService's in-process LIST_CACHE_TTL_MS.
  @Header('Cache-Control', 'public, max-age=30')
  async getAircraft(@Query('type') type?: string, @Query('serviceType') serviceType?: string) {
    try {
      const aircraft = serviceType
        ? await this.aircraftService.findByServiceType(serviceType)
        : type
          ? await this.aircraftService.findByType(type)
          : await this.aircraftService.findAll();
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

  @Get(':id/images')
  @ApiOperation({ summary: 'Get all gallery images for a specific aircraft' })
  @ApiParam({ name: 'id', type: Number, description: 'Aircraft ID' })
  @ApiResponse({ status: 200, description: 'Returns list of aircraft images' })
  @Header('Cache-Control', 'public, max-age=30')
  async getAircraftImages(@Param('id', ParseIntPipe) id: number) {
    try {
      const images = await this.aircraftService.findImagesByAircraftId(id);
      return { success: true, data: images };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch aircraft images',
        data: [],
      };
    }
  }
}
