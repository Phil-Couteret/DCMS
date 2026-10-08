import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LocationType } from '../../generated/prisma/enums.js';

export class LocationAddressDto {
  @IsOptional() @IsString() @MaxLength(200) street?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
}

export class LocationContactDto {
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) mobile?: string;

  @ValidateIf((_, v) => v !== undefined && v !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ValidateIf((_, v) => v !== undefined && v !== '')
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  website?: string;
}

// Replaces the whole location: address and contactInfo left out are cleared.
export class SaveLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEnum(LocationType)
  type: LocationType;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationAddressDto)
  address?: LocationAddressDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationContactDto)
  contactInfo?: LocationContactDto;

  // Inactive locations are hidden from selection lists.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
