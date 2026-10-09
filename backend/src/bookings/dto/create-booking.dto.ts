import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import {
  ActivityType,
  BookingAddOn,
  BookingSource,
  BookingStatus,
  TimeSlot,
} from '../../generated/prisma/enums.js';

export class CreateBookingDto {
  @IsUUID()
  customerId: string;

  // A boat booking; left out (or null on update) for a shore booking.
  @IsOptional()
  @IsUUID()
  boatId?: string | null;

  // A shore booking's session start, HH:mm (see SHORE_START_TIMES): no boat,
  // and its shore trip is found or made. siteId names the shore dive site
  // (needed when the center has several).
  @IsOptional()
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'shoreTime must be HH:mm' })
  shoreTime?: string | null;

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

  // Extras billed with the activity (prices in Settings → Pricing).
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(BookingAddOn, { each: true })
  addOns?: BookingAddOn[];

  // The days the customer says they are staying, asked at the first-dive
  // insurance check; suggests the insurance period on the Stays page.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3660)
  plannedStayDays?: number | null;

  // A government bono's code; its discount is applied when the booking is
  // invoiced. null or "" removes it on update.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bonoCode?: string | null;
}
