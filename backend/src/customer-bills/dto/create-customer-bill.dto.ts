import {
  IsArray,
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCustomerBillDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  locationId: string;

  @IsString()
  @MinLength(1)
  billNumber: string;

  @IsDateString()
  stayStartDate: string;

  @IsDateString()
  billDate: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  bookingIds?: string[];

  @IsOptional()
  @IsArray()
  billItems?: any[];

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNumber()
  @Min(0)
  tax: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  partnerPaidTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customerPaidTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  partnerTax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customerTax?: number;

  @IsOptional()
  @IsObject()
  breakdown?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}
