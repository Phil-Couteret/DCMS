import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateScheduleSlotGuideDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(['mole', 'boat'])
  slotType?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slotKey?: string;

  @IsOptional()
  @IsUUID()
  boatId?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  guideIds?: string[];
}
