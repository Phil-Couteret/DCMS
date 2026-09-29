import { IsBoolean, IsOptional } from 'class-validator';

export class LinkBookingDto {
  // Move a booking on another boat to the trip's boat.
  @IsOptional()
  @IsBoolean()
  reassignBoat?: boolean;
}
