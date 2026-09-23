import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
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

  @IsOptional()
  @IsEnum(BookingSource)
  bookingSource?: BookingSource;

  @IsOptional()
  @IsString()
  notes?: string;
}
