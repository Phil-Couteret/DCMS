import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StayCostCategory } from '../../generated/prisma/enums.js';

export class CreateStayCostDto {
  // Calendar day, YYYY-MM-DD.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  date: string;

  @IsEnum(StayCostCategory)
  category: StayCostCategory;

  // Optional for BEVERAGES, required otherwise (checked in the service).
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;

  // Net, before tax.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999.99)
  unitPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
