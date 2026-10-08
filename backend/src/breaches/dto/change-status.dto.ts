import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { BreachStatus } from '../../generated/prisma/enums.js';

// Moving to REPORTED records the report (reportedAt defaults to now); moving
// to RESOLVED needs resolutionDetails (resolutionDate defaults to now).
export class ChangeStatusDto {
  @IsEnum(BreachStatus)
  status: BreachStatus;

  @IsOptional()
  @IsISO8601({ strict: true })
  reportedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorityReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  resolutionDetails?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  resolutionDate?: string;
}
