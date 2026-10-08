import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TenantPlan } from '../../generated/prisma/enums.js';

// {slug}.dcms.<domain>: a DNS label, lowercase.
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SLUG_MESSAGE = 'slug: lowercase letters, digits and hyphens, not starting or ending with a hyphen';

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
}
