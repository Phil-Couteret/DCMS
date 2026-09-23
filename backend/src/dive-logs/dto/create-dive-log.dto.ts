import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDiveLogDto {
  @IsUUID()
  bookingId: string;

  @IsUUID()
  siteId: string;

  @IsOptional()
  @IsUUID()
  guideId?: string | null;

  // Stored as the calendar day at 00:00 UTC; its year sets the log number.
  @IsDateString()
  date: string;

  @IsDateString()
  entryTime: string;

  @IsDateString()
  exitTime: string;

  @IsInt()
  @Min(0)
  maxDepth: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  avgDepth?: number;

  // Minutes; must equal exitTime minus entryTime, rounded to the minute.
  @IsInt()
  @Min(1)
  duration: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  visibility?: number;

  @IsOptional()
  @IsInt()
  waterTemp?: number;

  @IsOptional()
  @IsString()
  weatherConditions?: string;

  @IsOptional()
  @IsString()
  seaConditions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  airStartBar?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  airEndBar?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
