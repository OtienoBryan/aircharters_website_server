import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripsService } from './trips.service';
import { UserTripStatus } from '../../common/entities/user-trips.entity';

@ApiTags('Trips')
@Controller('trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get pending bookings (bookings without user trips)' })
  @ApiResponse({
    status: 200,
    description: 'Pending bookings retrieved successfully',
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
              id: { type: 'string' },
              bookingId: { type: 'string' },
              status: { type: 'string', enum: ['pending'] },
              booking: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPendingBookings(@Request() req) {
    const userId = req.user.sub;
    const pendingBookings = await this.tripsService.getPendingBookings(userId);
    
    return {
      success: true,
      message: 'Pending bookings retrieved successfully',
      data: pendingBookings,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user trip history' })
  @ApiResponse({
    status: 200,
    description: 'Trip history retrieved successfully',
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
              id: { type: 'string' },
              bookingId: { type: 'string' },
              status: { type: 'string', enum: ['upcoming', 'completed', 'cancelled'] },
              rating: { type: 'number', nullable: true },
              review: { type: 'string', nullable: true },
              reviewDate: { type: 'string', format: 'date-time', nullable: true },
              photos: { type: 'string', nullable: true },
              videos: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              cancelledAt: { type: 'string', format: 'date-time', nullable: true },
              booking: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  referenceNumber: { type: 'string' },
                  totalPrice: { type: 'number' },
                  bookingStatus: { type: 'string' },
                  paymentStatus: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  deal: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      date: { type: 'string', format: 'date' },
                      time: { type: 'string' },
                      pricePerSeat: { type: 'number' },
                      company: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          name: { type: 'string' },
                          logo: { type: 'string', nullable: true },
                        },
                      },
                      route: {
                        type: 'object',
                        properties: {
                          origin: { type: 'string' },
                          destination: { type: 'string' },
                          duration: { type: 'string' },
                        },
                      },
                      aircraft: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          name: { type: 'string' },
                          type: { type: 'string' },
                          capacity: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTripHistory(@Request() req) {
    const userId = req.user.sub;
    const tripHistory = await this.tripsService.getUserTripHistory(userId);
    
    return {
      success: true,
      message: 'Trip history retrieved successfully',
      data: tripHistory,
    };
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get trips by status (upcoming, completed, cancelled)' })
  @ApiParam({ name: 'status', enum: UserTripStatus, description: 'Trip status' })
  @ApiResponse({
    status: 200,
    description: 'Trips retrieved successfully',
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
              id: { type: 'string' },
              bookingId: { type: 'string' },
              status: { type: 'string' },
              rating: { type: 'number', nullable: true },
              review: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              booking: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTripsByStatus(
    @Param('status') status: string,
    @Request() req,
  ) {
    const userId = req.user.sub;
    
    if (!Object.values(UserTripStatus).includes(status as UserTripStatus)) {
      throw new BadRequestException('Invalid trip status');
    }

    const trips = await this.tripsService.getTripsByStatus(
      userId,
      status as UserTripStatus,
    );
    
    return {
      success: true,
      message: `${status} trips retrieved successfully`,
      data: trips,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific trip by ID' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTripById(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    const trip = await this.tripsService.getTripById(id, userId);
    
    return {
      success: true,
      message: 'Trip retrieved successfully',
      data: trip,
    };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update trip status' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateTripStatus(
    @Param('id') id: string,
    @Body() body: { status: UserTripStatus },
    @Request() req,
  ) {
    const userId = req.user.sub;
    
    if (!Object.values(UserTripStatus).includes(body.status)) {
      throw new BadRequestException('Invalid trip status');
    }

    const updatedTrip = await this.tripsService.updateTripStatus(
      id,
      userId,
      body.status,
    );
    
    return {
      success: true,
      message: 'Trip status updated successfully',
      data: updatedTrip,
    };
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Add or update trip review and rating' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Review added successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid review data' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addTripReview(
    @Param('id') id: string,
    @Body() reviewData: {
      rating: number;
      review: string;
      photos?: string;
      videos?: string;
    },
    @Request() req,
  ) {
    const userId = req.user.sub;
    
    if (!reviewData.rating || !reviewData.review) {
      throw new BadRequestException('Rating and review are required');
    }

    const updatedTrip = await this.tripsService.addTripReview(
      id,
      userId,
      reviewData,
    );
    
    return {
      success: true,
      message: 'Review added successfully',
      data: updatedTrip,
    };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get trip statistics for user' })
  @ApiResponse({
    status: 200,
    description: 'Trip statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            upcoming: { type: 'number' },
            completed: { type: 'number' },
            cancelled: { type: 'number' },
            averageRating: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTripStats(@Request() req) {
    const userId = req.user.sub;
    const stats = await this.tripsService.getTripStats(userId);
    
    return {
      success: true,
      message: 'Trip statistics retrieved successfully',
      data: stats,
    };
  }

  // Legacy endpoint for backward compatibility
  @Get('me/trip-history')
  @ApiOperation({ summary: 'Get current user trip history (legacy endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Trip history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTripHistory(@Request() req) {
    const userId = req.user.sub;
    const tripHistory = await this.tripsService.getUserTripHistory(userId);
    
    return {
      success: true,
      message: 'Trip history retrieved successfully',
      data: tripHistory,
    };
  }
} 