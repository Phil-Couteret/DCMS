import { IsISO8601, IsNumber, Matches, Max, Min } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Bookings dated from..to (both inclusive) go on the invoice.
export class CreatePartnerInvoiceDto {
  @Matches(ISO_DATE, { message: 'from must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  from: string;

  @Matches(ISO_DATE, { message: 'to must be YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  to: string;
}

// The total paid so far; it replaces the previous figure.
export class RecordPartnerPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  paidAmount: number;
}
