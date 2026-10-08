import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  Max,
  Min,
} from 'class-validator';

export class CreateBoatDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;

  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  // Decimal(5,2): at most 999.99
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  length?: number | null;

  @IsOptional()
  @IsString()
  engine?: string | null;

  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string | null;

  @IsOptional()
  @IsDateString()
  lastServiceDate?: string | null;

  @IsOptional()
  @IsDateString()
  nextServiceDate?: string | null;

  // One of the tenant's locations; null unassigns.
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  locationId?: string | null;
}
