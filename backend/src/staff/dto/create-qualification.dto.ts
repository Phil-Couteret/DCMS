import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';

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

// Any field; expiryDate null clears it.
export class UpdateQualificationDto extends PartialType(OmitType(CreateQualificationDto, ['expiryDate'] as const)) {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  expiryDate?: string | null;
}
