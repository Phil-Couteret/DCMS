import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, Matches } from 'class-validator';

export class CreateIncomeDto {
  // Calendar day, YYYY-MM-DD.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999.99)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
