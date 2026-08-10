import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
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

  // Free-form extra detail (brand, model, thickness, purchase/warranty/
  // revision dates, first/second-stage + octopus brand/model for
  // regulators, notes) - see docs/roadmap.md Phase 6.12. No fixed shape,
  // same pattern as customers.preferences.
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
