import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class UpdateBoatDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsObject()
  equipmentOnboard?: any;

  @IsOptional()
  @IsObject()
  maintenanceSchedule?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
