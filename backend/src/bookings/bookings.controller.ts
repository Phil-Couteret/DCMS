import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BookingStatus } from '../generated/prisma/enums.js';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { ParseDatePipe } from './parse-date.pipe.js';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(BookingStatus, { optional: true }))
    status?: BookingStatus,
    @Query('date', ParseDatePipe) date?: string,
    @Query('boatId', new ParseUUIDPipe({ optional: true })) boatId?: string,
    @Query('customerId', new ParseUUIDPipe({ optional: true })) customerId?: string,
  ) {
    return this.bookings.findAll({ status, date, boatId, customerId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookingDto) {
    return this.bookings.update(id, dto);
  }

  // Cancels rather than deletes, so the booking history is kept.
  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.cancel(id);
  }
}
