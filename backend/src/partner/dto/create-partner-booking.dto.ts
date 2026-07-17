import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { booking_status, payment_method, payment_status } from '@prisma/client';

class InlineCustomerDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  nationality?: string;
}

export class CreatePartnerBookingDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InlineCustomerDto)
  customer?: InlineCustomerDto;

  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsUUID()
  boatId?: string;

  @IsOptional()
  @IsUUID()
  diveSiteId?: string;

  @IsDateString()
  bookingDate: string;

  // Not @IsEnum(activity_type): see bookings/dto/create-booking.dto.ts -
  // PartnerBookingsService.mapActivityType() remaps frontend aliases after validation.
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
}
