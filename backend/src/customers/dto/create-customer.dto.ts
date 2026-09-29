import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Language } from '../../generated/prisma/enums.js';

export class CreateCustomerDto {
  // Give either userId (an existing account) or email. With email, the account
  // is found or created: staff create customers who have never signed up.
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsDateString()
  birthdate?: string | null; // null clears it on update

  @IsOptional()
  @IsObject()
  emergencyContact?: Record<string, unknown> | null;

  // null clears them on update.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  certificationAgency?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  certificationLevel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  certificationNumber?: string | null;

  @IsOptional()
  @IsDateString()
  certificationExpiry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string | null;

  // Staff notes, not shown to the customer.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  loyaltyPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalDives?: number;
}
