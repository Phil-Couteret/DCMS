import { IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @MinLength(1)
  userType: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @MinLength(1)
  action: string;

  @IsString()
  @MinLength(1)
  resourceType: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsObject()
  details?: any;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
