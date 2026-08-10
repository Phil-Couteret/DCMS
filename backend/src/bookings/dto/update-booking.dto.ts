import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { booking_status, payment_method, payment_status } from '@prisma/client';

export class UpdateBookingDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  boatId?: string;

  @IsOptional()
  @IsUUID()
  diveSiteId?: string;

  @IsOptional()
  @IsUUID()
  staffPrimaryId?: string;

  @IsOptional()
  @IsDateString()
  bookingDate?: string;

  // See CreateBookingDto for why this isn't @IsEnum(activity_type).
  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  numberOfDives?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @IsEnum(payment_method)
  paymentMethod?: payment_method;

  @IsOptional()
  @IsEnum(payment_status)
  paymentStatus?: payment_status;

  @IsOptional()
  @IsEnum(booking_status)
  status?: booking_status;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsObject()
  equipmentNeeded?: any;

  @IsOptional()
  @IsUUID()
  bonoId?: string;

  @IsOptional()
  @IsUUID()
  stayId?: string;

  // Phase 6.17: which Mole (shore) slot or boat session this booking is
  // assigned to on the Schedule page. See docs/roadmap.md Phase 6.17.
  @IsOptional()
  @IsString()
  moleSlotTime?: string | null;

  @IsOptional()
  @IsString()
  session?: string | null;
}
