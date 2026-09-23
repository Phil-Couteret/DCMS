import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IncidentSeverity } from '../../generated/prisma/enums.js';

export class ReportIncidentDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  actionsTaken: string;

  @IsOptional()
  @IsBoolean()
  reportedToAuthorities?: boolean;
}
