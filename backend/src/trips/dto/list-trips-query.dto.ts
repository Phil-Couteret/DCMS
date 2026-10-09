import { IsDateString, IsOptional, IsUUID } from 'class-validator';

// Both ends are inclusive calendar days.
export class ListTripsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  // Only trips at this location (see tripAtLocation).
  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class BoatsNeededQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
