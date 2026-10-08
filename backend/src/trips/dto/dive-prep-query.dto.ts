import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TimeSlot } from '../../generated/prisma/enums.js';

export class DivePrepSlotDto {
  @IsDateString()
  date: string;

  @IsEnum(TimeSlot)
  timeSlot: TimeSlot;
}

// The preparation screen, optionally narrowed to one location.
export class DivePrepSlotQueryDto extends DivePrepSlotDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class DivePrepDateDto {
  @IsDateString()
  date: string;
}
