import { IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, Matches } from 'class-validator';
import { ExpenseCategory } from '../../generated/prisma/enums.js';

export class CreateExpenseDto {
  // Calendar day, YYYY-MM-DD.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  date: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  // Tax included.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999.99)
  amount: number;

  // The tax included in amount. Left out, it is worked out at the center's
  // current rate.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  tax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
