import {
  IsBoolean,
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
import { CustomerType, Language, SkillLevel } from '../../generated/prisma/enums.js';

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

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  // null clears it on update.
  @IsOptional()
  @IsEnum(SkillLevel)
  centerSkillLevel?: SkillLevel | null;

  // Whether the customer may book online.
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  // Medical certificate and insurance: null clears a field. Changing a number,
  // provider or expiry clears the verification unless it is set in the same
  // request.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  medicalCertNumber?: string | null;

  @IsOptional()
  @IsDateString()
  medicalCertExpiry?: string | null;

  @IsOptional()
  @IsDateString()
  medicalCertVerifiedAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceProvider?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  insurancePolicyNumber?: string | null;

  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string | null;

  @IsOptional()
  @IsDateString()
  insuranceVerifiedAt?: string | null;

  // When the customer signed the liability waiver, accepted instead of dive
  // insurance; null: not signed.
  @IsOptional()
  @IsDateString()
  waiverSignedAt?: string | null;

  // Equipment: ownEquipment means a full set of their own; the tank is always
  // the center's. Sizes are free text (the backoffice offers XS-XXL, and
  // 10L/12L/15L/Nitrox for tanks); null clears one.
  @IsOptional()
  @IsBoolean()
  ownEquipment?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tankSize?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bcdSize?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  wetsuitSize?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  finsSize?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bootsSize?: string | null;
}
