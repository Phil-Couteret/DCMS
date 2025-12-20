import { IsEnum, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConsentType, ConsentMethod } from '@prisma/client';

export class CreateConsentDto {
  @IsUUID()
  customerId: string;

  @IsEnum(ConsentType)
  consentType: ConsentType;

  @IsBoolean()
  consentGiven: boolean;

  @IsOptional()
  @IsEnum(ConsentMethod)
  consentMethod?: ConsentMethod;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

