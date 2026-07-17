import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { location_type } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(location_type)
  type: location_type;

  @IsObject()
  address: any;

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
