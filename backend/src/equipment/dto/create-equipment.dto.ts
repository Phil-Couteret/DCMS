import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { equipment_type } from '@prisma/client';

export class CreateEquipmentDto {
  @IsUUID()
  locationId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(equipment_type)
  category: equipment_type;

  @IsEnum(equipment_type)
  type: equipment_type;

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
}
