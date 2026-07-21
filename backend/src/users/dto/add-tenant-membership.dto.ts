import { IsUUID, IsOptional, IsEnum, IsArray, IsString } from 'class-validator';
import { user_role } from '@prisma/client';

export class AddTenantMembershipDto {
  @IsUUID(4)
  tenantId: string;

  @IsOptional()
  @IsEnum(user_role)
  role?: user_role;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationAccess?: string[];
}
