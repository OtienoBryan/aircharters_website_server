import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LocationsService } from './locations.service';
import { SearchLocationsDto } from './dto/search-locations.dto';
import { Location, LocationType } from '../../common/entities/location.entity';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all locations with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'Locations retrieved successfully',
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
              name: { type: 'string' },
              code: { type: 'string' },
              country: { type: 'string' },
              type: { type: 'string', enum: ['airport', 'city', 'region'] },
              latitude: { type: 'number', nullable: true },
              longitude: { type: 'number', nullable: true },
              imageUrl: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        count: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, enum: LocationType, description: 'Location type filter' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Country filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit results' })
  async findAll(@Query() searchDto: SearchLocationsDto) {
    const locations = await this.locationsService.findAll(searchDto);
    return {
      success: true,
      message: 'Locations retrieved successfully',
      data: locations,
      count: locations.length,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search locations by query' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Location' },
        },
        count: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit results (default: 10)' })
  async searchLocations(
    @Query('q') query: string,
    @Query('limit') limit: string = '10',
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const limitNum = parseInt(limit, 10) || 10;
    const locations = await this.locationsService.searchLocations(query, limitNum);
    
    return {
      success: true,
      message: 'Search results retrieved successfully',
      data: locations,
      count: locations.length,
    };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular locations (airports and major cities)' })
  @ApiResponse({
    status: 200,
    description: 'Popular locations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Location' },
        },
        count: { type: 'number' },
      },
    },
  })
  async getPopularLocations() {
    const locations = await this.locationsService.getPopularLocations();
    return {
      success: true,
      message: 'Popular locations retrieved successfully',
      data: locations,
      count: locations.length,
    };
  }

  @Get('country/:country')
  @ApiOperation({ summary: 'Get locations by country' })
  @ApiResponse({
    status: 200,
    description: 'Locations by country retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Location' },
        },
        count: { type: 'number' },
      },
    },
  })
  @ApiParam({ name: 'country', type: String, description: 'Country name' })
  async getLocationsByCountry(@Param('country') country: string) {
    const locations = await this.locationsService.getLocationsByCountry(country);
    return {
      success: true,
      message: `Locations in ${country} retrieved successfully`,
      data: locations,
      count: locations.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/Location' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Location ID' })
  async findById(@Param('id') id: string) {
    const location = await this.locationsService.findById(parseInt(id, 10));
    
    if (!location) {
      throw new BadRequestException('Location not found');
    }

    return {
      success: true,
      message: 'Location retrieved successfully',
      data: location,
    };
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get location by code' })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/Location' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiParam({ name: 'code', type: String, description: 'Location code (e.g., NBO)' })
  async findByCode(@Param('code') code: string) {
    const location = await this.locationsService.findByCode(code);
    
    if (!location) {
      throw new BadRequestException('Location not found');
    }

    return {
      success: true,
      message: 'Location retrieved successfully',
      data: location,
    };
  }

  @Get('route/:origin/:destination')
  @ApiOperation({ summary: 'Get route information between two locations' })
  @ApiResponse({
    status: 200,
    description: 'Route information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            distance: { type: 'number', description: 'Distance in kilometers' },
            duration: { type: 'number', description: 'Flight duration in minutes' },
            origin: { $ref: '#/components/schemas/Location' },
            destination: { $ref: '#/components/schemas/Location' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Route not found or coordinates missing' })
  @ApiParam({ name: 'origin', type: String, description: 'Origin location code' })
  @ApiParam({ name: 'destination', type: String, description: 'Destination location code' })
  @ApiQuery({ name: 'aircraftType', required: false, enum: ['jet', 'helicopter', 'fixedWing'], description: 'Aircraft type for duration calculation' })
  async getRouteInfo(
    @Param('origin') origin: string,
    @Param('destination') destination: string,
    @Query('aircraftType') aircraftType: 'jet' | 'helicopter' | 'fixedWing' = 'jet',
  ) {
    const routeInfo = await this.locationsService.getRouteInfo(
      origin,
      destination,
      aircraftType,
    );

    if (!routeInfo) {
      throw new BadRequestException('Route information not available. Coordinates may be missing.');
    }

    return {
      success: true,
      message: 'Route information retrieved successfully',
      data: routeInfo,
    };
  }
} 