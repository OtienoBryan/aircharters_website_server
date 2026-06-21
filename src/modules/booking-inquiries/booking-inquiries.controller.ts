import { Controller, Get, Post, Body, Param, Put, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
import { BookingInquiriesService } from './booking-inquiries.service';
import { CreateBookingInquiryDto } from './dto/create-booking-inquiry.dto';
import { UpdateBookingInquiryDto } from './dto/update-booking-inquiry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../common/entities/user.entity';

@Controller('booking-inquiries')
@UseGuards(JwtAuthGuard)
export class BookingInquiriesController {
  constructor(
    private readonly bookingInquiriesService: BookingInquiriesService,
  ) {}

  @Post()
  async create(
    @Body() createBookingInquiryDto: CreateBookingInquiryDto,
    @CurrentUser() user: User,
  ) {
    return this.bookingInquiriesService.create(createBookingInquiryDto, user.id);
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.bookingInquiriesService.findAll(user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.bookingInquiriesService.findOne(id);
  }

  @Get('reference/:referenceNumber')
  async findByReference(@Param('referenceNumber') referenceNumber: string) {
    return this.bookingInquiriesService.findByReference(referenceNumber);
  }

  @Put(':id/confirm')
  async confirmInquiry(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    const result = await this.bookingInquiriesService.confirmInquiry(id, user.id);
    return {
      success: true,
      message: 'Inquiry confirmed successfully',
      data: result,
    };
  }

  @Put(':id/cancel')
  async cancelInquiry(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.bookingInquiriesService.cancelInquiry(id, user.id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingInquiryDto: UpdateBookingInquiryDto,
  ) {
    return this.bookingInquiriesService.update(id, updateBookingInquiryDto);
  }

  @Get('aircraft/:aircraftId/availability')
  async getAircraftAvailabilityForInquiry(
    @Param('aircraftId', ParseIntPipe) aircraftId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.bookingInquiriesService.getAircraftAvailabilityForInquiry(aircraftId, start, end);
  }
} 