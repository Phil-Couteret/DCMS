import {
  IsDateString,
  IsEnum,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../generated/prisma/enums.js';

export class AddPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999.99)
  amount: number;

  // Defaults to the invoice currency and must match it.
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stripePaymentId?: string;

  // Defaults: CASH and TRANSFER SUCCEEDED, CARD PENDING.
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  // Defaults to now when the payment is SUCCEEDED.
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
