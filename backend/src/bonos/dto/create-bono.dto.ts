import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BonoType } from '../../generated/prisma/enums.js';

export class CreateBonoDto {
  // Letters, digits and dashes; stored upper case.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9-]{1,39}$/, { message: 'code must be 2 to 40 letters, digits or dashes' })
  code: string;

  @IsEnum(BonoType)
  type: BonoType;

  // A percentage (1–100) or an amount in the center's currency.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99_999_999)
  discountValue: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsDateString()
  validFrom: string;

  // null: no end date (on update, clears it).
  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  // null: no limit.
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
