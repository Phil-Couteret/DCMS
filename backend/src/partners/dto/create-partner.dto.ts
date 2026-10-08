import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName: string;

  @IsEmail()
  @MaxLength(254)
  contactEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string | null;

  // Percentage the partner keeps, e.g. 15 for 15%.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
