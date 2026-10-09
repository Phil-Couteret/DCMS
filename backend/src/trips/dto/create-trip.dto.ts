import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { TimeSlot } from '../../generated/prisma/enums.js';

export class CreateTripDto {
  // Stored as the calendar day at 00:00 UTC.
  @IsDateString()
  date: string;

  @IsEnum(TimeSlot)
  timeSlot: TimeSlot;

  // Left out for a shore trip (beach, harbour or pool).
  @IsOptional()
  @IsUUID()
  boatId?: string | null;

  // A shore trip's session start, HH:mm (SHORE_START_TIMES).
  @IsOptional()
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be HH:mm' })
  startTime?: string | null;

  @IsOptional()
  @IsUUID()
  plannedSiteId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDivers?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
