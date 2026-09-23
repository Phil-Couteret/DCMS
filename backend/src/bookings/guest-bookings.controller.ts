import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { BookingsService } from './bookings.service.js';
import { GuestBookingDto } from './dto/guest-booking.dto.js';

const ONE_HOUR = 60 * 60 * 1000;

// Public: no JwtAuthGuard. Kept apart from BookingsController, whose routes
// are all guarded at class level. Limited to 5 requests per IP per hour.
@Controller('bookings/guest')
@UseGuards(ThrottlerGuard)
export class GuestBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR } })
  create(@Body() dto: GuestBookingDto) {
    return this.bookings.createGuest(dto);
  }
}
