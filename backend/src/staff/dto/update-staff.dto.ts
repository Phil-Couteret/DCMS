import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { staff_role } from '@prisma/client';

export class UpdateStaffDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  locationIds?: string[];

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
  @IsEnum(staff_role)
  role?: staff_role;

  @IsOptional()
  @IsObject()
  certifications?: any;

  @IsOptional()
  @IsObject()
  emergencyContact?: any;

  @IsOptional()
  @IsDateString()
  employmentStartDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
