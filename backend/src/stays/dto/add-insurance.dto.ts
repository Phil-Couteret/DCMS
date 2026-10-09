import { IsOptional, IsUUID } from 'class-validator';

// The insurance period to add to a stay; the suggested one when left out.
export class AddInsuranceDto {
  @IsOptional()
  @IsUUID()
  periodId?: string;
}
