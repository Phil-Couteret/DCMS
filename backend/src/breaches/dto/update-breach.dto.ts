import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { NOTIFY_METHODS } from '../breach-rules.js';
import { CreateBreachDto } from './create-breach.dto.js';

// The status moves through POST /breaches/:id/status. The reporting fields
// can be corrected once the breach has been reported, the resolution fields
// once it is resolved; null clears an optional one.
export class UpdateBreachDto extends PartialType(CreateBreachDto) {
  @IsOptional()
  @IsISO8601({ strict: true })
  reportedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorityReference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  resolutionDetails?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  resolutionDate?: string;

  // Corrections to the customer notification, once recorded.
  @IsOptional()
  @IsISO8601({ strict: true })
  customersNotifiedAt?: string;

  @IsOptional()
  @IsIn(NOTIFY_METHODS)
  customersNotifiedMethod?: string;
}
