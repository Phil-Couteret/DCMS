import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvoiceStatus } from '../../generated/prisma/enums.js';
import { InvoiceItemDto } from './invoice-item.dto.js';

const MONEY = { maxDecimalPlaces: 2 } as const;
const MAX_AMOUNT = 99_999_999.99; // Decimal(10,2)

// PARTIAL and PAID are set by payments, CANCELLED by the cancel route.
export const EDITABLE_STATUSES = [InvoiceStatus.DRAFT, InvoiceStatus.SENT] as const;

export class CreateInvoiceDto {
  @IsUUID()
  bookingId: string;

  // Must be the booking's customer.
  @IsUUID()
  customerId: string;

  // Must equal the sum of the item totals.
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_AMOUNT)
  subtotal: number;

  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_AMOUNT)
  tax: number;

  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_AMOUNT)
  discount?: number;

  // Must equal subtotal + tax - discount.
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_AMOUNT)
  total: number;

  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;

  @IsOptional()
  @IsIn(EDITABLE_STATUSES)
  status?: (typeof EDITABLE_STATUSES)[number];

  @IsDateString()
  dueDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
