import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { GuestBookingsController } from './guest-bookings.controller.js';

@Module({
  imports: [SettingsModule],
  controllers: [BookingsController, GuestBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
