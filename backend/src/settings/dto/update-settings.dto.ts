import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

// Replaces the whole record: optional fields left out or null are cleared.
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
}
