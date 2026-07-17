import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { booking_status, payment_status } from '@prisma/client';

export class UpdatePartnerBookingDto {
  @IsOptional()
  @IsDateString()
  bookingDate?: string;

  // See CreatePartnerBookingDto for why this isn't @IsEnum(activity_type).
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
}
