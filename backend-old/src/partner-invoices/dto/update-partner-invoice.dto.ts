import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePartnerInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  // Plain varchar in the DB, no fixed enum (pending/paid/... by convention).
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;
}
