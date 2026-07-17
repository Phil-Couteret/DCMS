import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerBillDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
