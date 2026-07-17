import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateBoatDto {
  @IsUUID()
  locationId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(1)
  capacity: number;

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
