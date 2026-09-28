import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TripStatus } from '../../generated/prisma/enums.js';

// Date, time slot and boat identify the trip and are not editable: cancel it
// and create another instead.
export class UpdateTripDto {
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsUUID()
  plannedSiteId?: string | null;

  @IsOptional()
  @IsUUID()
  actualSiteId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
