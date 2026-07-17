import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { location_type } from '@prisma/client';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(location_type)
  type?: location_type;

  @IsOptional()
  @IsObject()
  address?: any;

  @IsOptional()
  @IsObject()
  contactInfo?: any;

  @IsOptional()
  @IsObject()
  settings?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
