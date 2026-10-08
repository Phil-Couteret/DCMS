import {
  IsEmail,
  IsEnum,
  IsHexColor,
  IsIn,
  Matches,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CURRENCIES, TIME_ZONES } from '../../config/tenant-defaults.js';
import { Language } from '../../generated/prisma/enums.js';

// Invoice number prefixes: PREFIX-YYYY-0001.
const PREFIX = /^[A-Z0-9]{1,10}$/;

// Replaces the whole record: optional fields left out or null are cleared,
// except the tax, regional, branding and numbering fields, which keep their
// values when left out (logoUrl and the colours are cleared by null).
export class UpdateSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  website?: string | null;

  // A percentage, e.g. 7 for 7%.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  taxName?: string;

  // IANA name, e.g. Atlantic/Canary, Europe/Madrid.
  @IsOptional()
  @IsIn([...TIME_ZONES], { message: 'timeZone must be an IANA time zone, e.g. Europe/Madrid' })
  timeZone?: string;

  @IsOptional()
  @IsIn([...CURRENCIES], { message: 'currency must be an ISO 4217 code, e.g. EUR' })
  currency?: string;

  @IsOptional()
  @IsEnum(Language)
  defaultLanguage?: Language;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  logoUrl?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsHexColor()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'primaryColor must be #rrggbb' })
  primaryColor?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsHexColor()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'accentColor must be #rrggbb' })
  accentColor?: string | null;

  @IsOptional()
  @Matches(PREFIX, { message: 'invoicePrefix: 1 to 10 capital letters or digits' })
  invoicePrefix?: string;

  @IsOptional()
  @Matches(PREFIX, { message: 'partnerInvoicePrefix: 1 to 10 capital letters or digits' })
  partnerInvoicePrefix?: string;
}
