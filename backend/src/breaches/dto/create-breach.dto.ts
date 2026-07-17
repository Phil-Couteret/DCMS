import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { breach_type, data_type, severity } from '@prisma/client';

export class CreateBreachDto {
  @IsEnum(breach_type)
  breachType: breach_type;

  @IsOptional()
  @IsEnum(severity)
  severity?: severity;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(data_type, { each: true })
  affectedDataTypes?: data_type[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  affectedCustomerIds?: string[];

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  containmentMeasures?: string;

  @IsOptional()
  @IsString()
  mitigationActions?: string;

  @IsOptional()
  @IsString()
  reportedBy?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
