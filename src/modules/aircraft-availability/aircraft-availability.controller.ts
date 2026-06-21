import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AircraftAvailabilityService } from './aircraft-availability.service';
import { AircraftAvailabilitySearchDto, AvailableAircraftDto } from './dto/aircraft-availability.dto';
import { CalendarEventType } from '../../common/entities/aircraft-calendar.entity';

@ApiTags('Aircraft Availability')
@Controller('aircraft-availability')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AircraftAvailabilityController {
  constructor(
    private readonly aircraftAvailabilityService: AircraftAvailabilityService,
  ) {}

  @Post('search')
  @ApiOperation({ summary: 'Search for available aircraft' })
  @ApiResponse({
    status: 200,
    description: 'Available aircraft found',
    type: [AvailableAircraftDto],
  })
  @ApiBody({ type: AircraftAvailabilitySearchDto })
  async searchAvailableAircraft(
    @Body() searchDto: AircraftAvailabilitySearchDto,
  ): Promise<AvailableAircraftDto[]> {
    return this.aircraftAvailabilityService.searchAvailableAircraft(searchDto);
  }

  @Get(':aircraftId/availability')
  @ApiOperation({ summary: 'Get aircraft availability for a date range' })
  @ApiParam({ name: 'aircraftId', description: 'Aircraft ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Aircraft availability data',
  })
  async getAircraftAvailability(
    @Param('aircraftId') aircraftId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.aircraftAvailabilityService.getAircraftAvailability(aircraftId, start, end);
  }

  @Post(':aircraftId/calendar-event')
  @ApiOperation({ summary: 'Create calendar event for aircraft' })
  @ApiParam({ name: 'aircraftId', description: 'Aircraft ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventType: { type: 'string', enum: Object.values(CalendarEventType) },
        startTime: { type: 'string', format: 'date-time' },
        endTime: { type: 'string', format: 'date-time' },
        description: { type: 'string' },
      },
      required: ['eventType', 'startTime', 'endTime'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Calendar event created successfully',
  })
  async createCalendarEvent(
    @Param('aircraftId') aircraftId: number,
    @Body() eventData: {
      eventType: CalendarEventType;
      startTime: string;
      endTime: string;
      description?: string;
    },
  ) {
    const startTime = new Date(eventData.startTime);
    const endTime = new Date(eventData.endTime);
    return this.aircraftAvailabilityService.createCalendarEvent(
      aircraftId,
      eventData.eventType,
      startTime,
      endTime,
      eventData.description,
    );
  }
} 