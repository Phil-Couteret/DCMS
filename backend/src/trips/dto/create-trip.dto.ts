import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TimeSlot } from '../../generated/prisma/enums.js';

export class CreateTripDto {
  // Stored as the calendar day at 00:00 UTC.
  @IsDateString()
  date: string;

  @IsEnum(TimeSlot)
  timeSlot: TimeSlot;

  // Left out for a shore dive.
  @IsOptional()
  @IsUUID()
  boatId?: string | null;

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
