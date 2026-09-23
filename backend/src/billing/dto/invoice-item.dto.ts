import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const MONEY = { maxDecimalPlaces: 2 } as const;
const MAX_AMOUNT = 99_999_999.99; // Decimal(10,2)

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_AMOUNT)
  unitPrice: number;

  // Must equal quantity x unitPrice.
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_AMOUNT)
  total: number;

  @IsString()
  @IsNotEmpty()
  type: string;
}
