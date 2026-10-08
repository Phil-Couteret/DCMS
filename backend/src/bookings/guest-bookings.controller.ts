import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TenantThrottlerGuard } from '../tenant/tenant-throttler.guard.js';
import { BookingsService } from './bookings.service.js';
import { GuestBookingDto } from './dto/guest-booking.dto.js';

const ONE_HOUR = 60 * 60 * 1000;

// Public: no auth guard. Kept apart from BookingsController, whose routes
// are all guarded at class level. Limited to 5 requests per IP per hour, for
// each center.
@Controller('bookings/guest')
@UseGuards(TenantThrottlerGuard)
export class GuestBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR } })
  create(@Body() dto: GuestBookingDto) {
    return this.bookings.createGuest(dto);
  }
}
