import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PartnerBookingsService, CreatePartnerBookingDto, UpdatePartnerBookingDto } from './partner-bookings.service';
import { JwtPartnerGuard } from '../partner-auth/jwt-partner.guard';
import { Partner } from '../common/decorators/partner.decorator';

@ApiTags('partner')
@ApiBearerAuth()
@Controller('partner/bookings')
@UseGuards(JwtPartnerGuard)
export class PartnerBookingsController {
  constructor(private readonly partnerBookingsService: PartnerBookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bookings created by the partner' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'List of partner bookings' })
  async findAll(
    @Query('date') date?: string,
    @Partner() partner?: any,
  ) {
    if (date) {
      return this.partnerBookingsService.findByDate(date, partner.id);
    }
    return this.partnerBookingsService.findAll(partner.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID (only if created by partner)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id') id: string, @Partner() partner: any) {
    return this.partnerBookingsService.findOne(id, partner.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking (can create customer inline)' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 404, description: 'Location or customer not found' })
  @ApiResponse({ status: 403, description: 'Location not allowed for this partner' })
  async create(@Body() createDto: CreatePartnerBookingDto, @Partner() partner: any) {
    return this.partnerBookingsService.create(createDto, partner.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a booking (only if created by partner)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePartnerBookingDto,
    @Partner() partner: any,
  ) {
    return this.partnerBookingsService.update(id, updateDto, partner.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (only if created by partner)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async cancel(@Param('id') id: string, @Partner() partner: any) {
    return this.partnerBookingsService.cancel(id, partner.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a booking (only if created by partner)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking deleted' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(@Param('id') id: string, @Partner() partner: any) {
    return this.partnerBookingsService.remove(id, partner.id);
  }
}

