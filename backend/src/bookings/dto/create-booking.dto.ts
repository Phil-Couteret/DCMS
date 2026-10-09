import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ActivityType,
  BookingSource,
  BookingStatus,
  TimeSlot,
} from '../../generated/prisma/enums.js';

export class CreateBookingDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  boatId: string;

  @IsOptional()
  @IsUUID()
  siteId?: string | null;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  // Stored as the calendar day at 00:00 UTC.
  @IsDateString()
  date: string;

  @IsEnum(TimeSlot)
  timeSlot: TimeSlot;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsInt()
  @Min(1)
  participantCount: number;

  // Dives in the booking (default 1). Fun dives are billed per dive.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfDives?: number;

  @IsOptional()
  @IsEnum(BookingSource)
  bookingSource?: BookingSource;

  // The partner that sold the booking; setting one makes the source PARTNER.
  // null removes it on update.
  @IsOptional()
  @IsUUID()
  partnerId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  // A government bono's code; its discount is applied when the booking is
  // invoiced. null or "" removes it on update.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bonoCode?: string | null;
}
