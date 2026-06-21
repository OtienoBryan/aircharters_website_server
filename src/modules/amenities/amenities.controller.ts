import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AmenitiesService } from './amenities.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { AssignAmenitiesDto } from './dto/assign-amenities.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Amenities')
@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new amenity' })
  @ApiResponse({ status: 201, description: 'Amenity created successfully' })
  @ApiResponse({ status: 409, description: 'Amenity with this name already exists' })
  create(@Body() createAmenityDto: CreateAmenityDto) {
    return this.amenitiesService.create(createAmenityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all amenities' })
  @ApiResponse({ status: 200, description: 'List of all amenities' })
  findAll() {
    return this.amenitiesService.findAll();
  }

  @Get('with-usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all amenities with usage statistics' })
  @ApiResponse({ status: 200, description: 'List of amenities with usage data' })
  getAmenitiesWithUsage() {
    return this.amenitiesService.getAmenitiesWithUsage();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get amenity by ID' })
  @ApiResponse({ status: 200, description: 'Amenity found' })
  @ApiResponse({ status: 404, description: 'Amenity not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.amenitiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update amenity' })
  @ApiResponse({ status: 200, description: 'Amenity updated successfully' })
  @ApiResponse({ status: 404, description: 'Amenity not found' })
  @ApiResponse({ status: 409, description: 'Amenity with this name already exists' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAmenityDto: UpdateAmenityDto) {
    return this.amenitiesService.update(id, updateAmenityDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete amenity' })
  @ApiResponse({ status: 200, description: 'Amenity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Amenity not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete amenity - it is in use' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.amenitiesService.remove(id);
  }

  @Get('aircraft/:aircraftId')
  @ApiOperation({ summary: 'Get amenities for a specific aircraft' })
  @ApiResponse({ status: 200, description: 'List of aircraft amenities' })
  getAircraftAmenities(@Param('aircraftId', ParseIntPipe) aircraftId: number) {
    return this.amenitiesService.getAircraftAmenities(aircraftId);
  }

  @Get('charter-deal/:dealId')
  @ApiOperation({ summary: 'Get amenities for a specific charter deal' })
  @ApiResponse({ status: 200, description: 'List of charter deal amenities' })
  getCharterDealAmenities(@Param('dealId', ParseIntPipe) dealId: number) {
    return this.amenitiesService.getCharterDealAmenities(dealId);
  }

  @Post('aircraft/:aircraftId/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'companyAdmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign amenities to an aircraft' })
  @ApiResponse({ status: 200, description: 'Amenities assigned successfully' })
  assignAmenitiesToAircraft(
    @Param('aircraftId', ParseIntPipe) aircraftId: number,
    @Body() assignAmenitiesDto: AssignAmenitiesDto
  ) {
    return this.amenitiesService.assignAmenitiesToAircraft(aircraftId, assignAmenitiesDto);
  }

  @Post('charter-deal/:dealId/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'companyAdmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign amenities to a charter deal' })
  @ApiResponse({ status: 200, description: 'Amenities assigned successfully' })
  assignAmenitiesToCharterDeal(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Body() assignAmenitiesDto: AssignAmenitiesDto
  ) {
    return this.amenitiesService.assignAmenitiesToCharterDeal(dealId, assignAmenitiesDto);
  }
}
