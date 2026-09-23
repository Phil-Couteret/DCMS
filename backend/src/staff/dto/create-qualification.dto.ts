import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQualificationDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  agency: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
