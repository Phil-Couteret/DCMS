import { OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateBookingDto } from '../../bookings/dto/create-booking.dto.js';

// A booking as the form has it so far, to price before it is saved: for a
// customer (their open stay counts) or none yet (a new customer), and for a
// new booking or an edit of bookingId.
export class QuoteBookingDto extends OmitType(CreateBookingDto, ['customerId', 'boatId', 'shoreTime', 'siteId', 'status'] as const) {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
