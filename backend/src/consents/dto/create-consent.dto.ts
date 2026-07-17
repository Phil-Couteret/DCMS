import { IsEnum, IsBoolean, IsOptional, IsString } from 'class-validator';
import { consent_type, consent_method } from '@prisma/client';

// customerId comes from the :customerId route param (see
// ConsentsController.recordConsent), not the request body.
export class CreateConsentDto {
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

