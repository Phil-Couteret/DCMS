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

export class CreateStaffDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  locationIds?: string[];

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(staff_role)
  role: staff_role;

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
