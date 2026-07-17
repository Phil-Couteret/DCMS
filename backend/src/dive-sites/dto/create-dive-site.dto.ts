import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { activity_type } from '@prisma/client';

export class CreateDiveSiteDto {
  @IsUUID()
  locationId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(activity_type)
  type: activity_type;

  @IsOptional()
  @IsObject()
  depthRange?: any;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
