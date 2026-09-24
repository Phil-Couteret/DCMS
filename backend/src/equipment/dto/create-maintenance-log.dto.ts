import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAINTENANCE_TYPES = ['routine', 'repair', 'inspection'] as const;

export class CreateMaintenanceLogDto {
  // Stored as the calendar day at 00:00 UTC.
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  technician: string;

  @IsIn(MAINTENANCE_TYPES)
  type: (typeof MAINTENANCE_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Decimal(10,2): at most 99,999,999.99
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  cost?: number;
}
