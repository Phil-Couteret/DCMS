import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { TankStatus } from '../../generated/prisma/enums.js';
import { TANK_SIZES, type TankSize } from '../tank-rules.js';

export class CreateTankDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  serialNumber: string;

  @IsIn(TANK_SIZES)
  size: TankSize;

  // null clears these on update.
  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @IsOptional()
  @IsDateString()
  visualInspectionDate?: string | null;

  @IsOptional()
  @IsDateString()
  hydrostaticTestDate?: string | null;

  @IsOptional()
  @IsEnum(TankStatus)
  status?: TankStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
