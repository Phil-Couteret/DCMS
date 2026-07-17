import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateGovernmentBonoDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  type: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentUsage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
