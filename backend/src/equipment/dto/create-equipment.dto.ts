import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EquipmentCondition, EquipmentStatus } from '../../generated/prisma/enums.js';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  serialNumber?: string;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @IsOptional()
  @IsEnum(EquipmentCondition)
  condition?: EquipmentCondition;

  @IsDateString()
  purchaseDate: string;

  // Decimal(10,2): at most 99,999,999.99
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  purchaseCost: number;

  @IsOptional()
  @IsDateString()
  lastMaintenance?: string;

  @IsOptional()
  @IsDateString()
  nextMaintenance?: string;
}
