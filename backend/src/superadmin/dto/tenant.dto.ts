import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsObject, ValidateNested } from 'class-validator';
import { CURRENCIES, TIME_ZONES } from '../../config/tenant-defaults.js';
import { Language, LocationType, TenantPlan } from '../../generated/prisma/enums.js';

// {slug}.dcms.<domain>: a DNS label, lowercase.
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SLUG_MESSAGE = 'slug: lowercase letters, digits and hyphens, not starting or ending with a hyphen';

// Authorized limits; left out, the platform defaults (quotas.ts).
export class QuotasDto {
  @IsOptional() @IsInt() @Min(0) @Max(100000) locations?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100000) diveSites?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100000) boats?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100000) users?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) customers?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100000) storageGb?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000) storagePricePerGbMonth?: number;
}

// The center's first location.
export class FirstLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;
}

// The center's first admin, invited by email.
export class FirstAdminDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(SLUG, { message: SLUG_MESSAGE })
  slug: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  // The center's regional settings; left out, the platform defaults
  // (Atlantic/Canary, EUR, English, IGIC 7%). All can be changed later in
  // the center's Settings.
  @IsOptional()
  @IsIn([...TIME_ZONES], { message: 'timeZone must be an IANA time zone, e.g. Europe/Madrid' })
  timeZone?: string;

  @IsOptional()
  @IsIn([...CURRENCIES], { message: 'currency must be an ISO 4217 code, e.g. EUR' })
  currency?: string;

  @IsOptional()
  @IsEnum(Language)
  defaultLanguage?: Language;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  taxName?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FirstLocationDto)
  firstLocation?: FirstLocationDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FirstAdminDto)
  firstAdmin?: FirstAdminDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QuotasDto)
  quotas?: QuotasDto;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  // false: a soft delete. Its users are signed out and its site stops.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Replaces the quotas given; the others keep their values.
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QuotasDto)
  quotas?: QuotasDto;
}
