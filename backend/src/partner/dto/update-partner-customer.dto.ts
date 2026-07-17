import { IsDateString, IsEmail, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { customer_type } from '@prisma/client';

export class UpdatePartnerCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsObject()
  address?: any;

  @IsOptional()
  @IsEnum(customer_type)
  customerType?: customer_type;

  @IsOptional()
  @IsObject()
  preferences?: any;

  @IsOptional()
  @IsObject()
  medicalConditions?: any;

  @IsOptional()
  @IsObject()
  restrictions?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}
