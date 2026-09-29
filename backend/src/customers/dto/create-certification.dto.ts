import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCertificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  agency: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  level: string;

  // null clears these on update.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  cardNumber?: string | null;

  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;
}
