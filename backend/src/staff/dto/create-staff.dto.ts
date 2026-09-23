import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { StaffStatus, StaffType } from '../../generated/prisma/enums.js';

export class CreateStaffDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEnum(StaffType)
  type: StaffType;

  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @IsDateString()
  hireDate: string;
}
