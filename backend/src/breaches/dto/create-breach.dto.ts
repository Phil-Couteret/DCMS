import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BreachSeverity } from '../../generated/prisma/enums.js';
import { BREACH_TYPES, DATA_TYPES } from '../breach-rules.js';

export class CreateBreachDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  // An instant with its offset, e.g. 2026-10-08T09:30:00.000Z.
  @IsISO8601({ strict: true })
  detectedAt: string;

  @IsEnum(BreachSeverity)
  severity: BreachSeverity;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  description: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(DATA_TYPES.length)
  @IsIn(DATA_TYPES, { each: true })
  affectedDataTypes: string[];

  // null clears it on update.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  estimatedAffected?: number | null;

  // The details below are optional; null clears one on update.
  @IsOptional()
  @IsIn(BREACH_TYPES)
  breachType?: string | null;

  // When the incident itself happened, if known: not after it was detected.
  @IsOptional()
  @IsISO8601({ strict: true })
  occurredAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  rootCause?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  containmentMeasures?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  mitigationMeasures?: string | null;
}
