import { IsBase64, IsString, Matches, MaxLength } from 'class-validator';

// The invoice document the backoffice rendered, sent on by email.
export class EmailInvoiceDto {
  // A PDF, base64-encoded (at most about 700 kB once decoded).
  @IsString()
  @IsBase64()
  @MaxLength(960_000)
  pdf: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._-]{1,80}\.pdf$/, { message: 'filename must be a simple name ending in .pdf' })
  filename: string;
}
