import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { equipment_type } from '@prisma/client';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(equipment_type)
  category?: equipment_type;

  @IsOptional()
  @IsEnum(equipment_type)
  type?: equipment_type;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
