import { IsEnum, IsUUID } from 'class-validator';
import { TripStaffRole } from '../../generated/prisma/enums.js';

export class AssignStaffDto {
  @IsUUID()
  staffId: string;

  @IsEnum(TripStaffRole)
  role: TripStaffRole;
}
