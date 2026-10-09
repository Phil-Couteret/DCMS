import { IsEnum } from 'class-validator';
import { StaffStatus } from '../../generated/prisma/enums.js';

export class SetStaffStatusDto {
  @IsEnum(StaffStatus)
  status: StaffStatus;
}
