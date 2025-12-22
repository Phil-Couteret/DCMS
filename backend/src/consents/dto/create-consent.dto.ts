import { IsEnum, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { consent_type, consent_method } from '@prisma/client';

export class CreateConsentDto {
  @IsUUID()
  customerId: string;

  @IsEnum(consent_type)
  consentType: consent_type;

  @IsBoolean()
  consentGiven: boolean;

  @IsOptional()
  @IsEnum(consent_method)
  consentMethod?: consent_method;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

