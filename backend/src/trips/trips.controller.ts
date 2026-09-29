import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AssignStaffDto } from './dto/assign-staff.dto.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { LinkBookingDto } from './dto/link-booking.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripsService } from './trips.service.js';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  findAll(@Query() query: ListTripsQueryDto) {
    return this.trips.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.trips.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTripDto) {
    return this.trips.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trips.remove(id);
  }

  @Post(':id/staff')
  assignStaff(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignStaffDto) {
    return this.trips.assignStaff(id, dto);
  }

  @Delete(':id/staff/:staffId')
  removeStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.trips.removeStaff(id, staffId);
  }

  @Post(':id/bookings/:bookingId')
  linkBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: LinkBookingDto,
  ) {
    return this.trips.linkBooking(id, bookingId, dto);
  }

  @Delete(':id/bookings/:bookingId')
  unlinkBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.trips.unlinkBooking(id, bookingId);
  }
}
