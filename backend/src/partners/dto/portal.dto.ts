import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ActivityType, Language, TimeSlot } from '../../generated/prisma/enums.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class PartnerCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  // Nationality, as an ISO country code (ES, GB, DE…).
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a two-letter country code' })
  country: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'birthdate must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  birthdate?: string;
}

// For an existing customer of the partner's (customerId), or a new one
// (customer). Prices are the center's; the partner does not send one.
export class PartnerBookingDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerCustomerDto)
  customer?: PartnerCustomerDto;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  @Matches(ISO_DATE, { message: 'date must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  date: string;

  @IsEnum(TimeSlot)
  timeSlot: TimeSlot;

  @IsInt()
  @Min(1)
  @Max(20)
  participantCount: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
