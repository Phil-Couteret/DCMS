import { IsDateString, IsEnum } from 'class-validator';
import { TimeSlot } from '../../generated/prisma/enums.js';

export class DivePrepSlotDto {
  @IsDateString()
  date: string;

  @IsEnum(TimeSlot)
  timeSlot: TimeSlot;
}

export class DivePrepDateDto {
  @IsDateString()
  date: string;
}
