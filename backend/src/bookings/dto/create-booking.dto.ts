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

export class CreateBookingDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsUUID()
  boatId?: string;

  @IsOptional()
  @IsUUID()
  diveSiteId?: string;

  @IsOptional()
  @IsUUID()
  staffPrimaryId?: string;

  @IsDateString()
  bookingDate: string;

  // Not @IsEnum(activity_type): the frontend also sends aliases
  // (scuba_diving, discover_scuba, discover, dive_course) that
  // BookingsService.mapActivityType() remaps to the real enum after
  // validation. Enforcing the strict enum here would reject those.
  @IsString()
  activityType: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  numberOfDives?: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsNumber()
  @Min(0)
  totalPrice: number;

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
}
