import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { GuestBookingsController } from './guest-bookings.controller.js';

@Module({
  controllers: [BookingsController, GuestBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
