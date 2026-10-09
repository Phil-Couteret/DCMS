import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { TripStatus } from '../../generated/prisma/enums.js';

// Date, time slot and boat identify the trip and are not editable: cancel it
// and create another instead.
export class UpdateTripDto {
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  // A shore session's start, HH:mm: its bookings move with it.
  @IsOptional()
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be HH:mm' })
  startTime?: string;

  @IsOptional()
  @IsUUID()
  plannedSiteId?: string | null;

  @IsOptional()
  @IsUUID()
  actualSiteId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  // Post-dive report. Times are HH:mm, center local time; null clears one.
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '$property must be a time as HH:mm' })
  entryTime?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '$property must be a time as HH:mm' })
  exitTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reportNotes?: string | null;
}
