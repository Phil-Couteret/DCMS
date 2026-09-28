import { IsDateString, IsOptional } from 'class-validator';

// Both ends are inclusive calendar days.
export class ListTripsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
