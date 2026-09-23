import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class SetAvailabilityDto {
  // Stored as the calendar day at 00:00 UTC, so one entry per staff member per day.
  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
