import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CargoService } from './cargo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CargoShipment } from '../../common/entities/cargo-shipment.entity';

function toDto(s: CargoShipment) {
  return {
    id: s.id,
    awb_number: s.awbNumber,
    origin_code: s.originCode,
    destination_code: s.destinationCode,
    weight_kg: s.weightKg,
    status: s.status,
  };
}

@ApiTags('Cargo')
@Controller('cargo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  @Get()
  @ApiOperation({ summary: 'List cargo shipments for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Cargo shipments retrieved successfully' })
  async findAll(@Request() req) {
    const shipments = await this.cargoService.findForUser(req.user.sub);
    return {
      success: true,
      message: 'Cargo shipments retrieved successfully',
      data: shipments.map(toDto),
    };
  }
}
