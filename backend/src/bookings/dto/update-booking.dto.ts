import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto.js';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}
