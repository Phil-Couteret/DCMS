import { IsBoolean, IsOptional } from 'class-validator';

export class BillStayDto {
  // Bill the customer's fun dives at the matching dive pack's price (the
  // stay's `pack`), instead of the stay rate.
  @IsOptional()
  @IsBoolean()
  usePack?: boolean;
}
