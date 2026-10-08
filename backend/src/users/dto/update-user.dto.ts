import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class UpdateUserDto {
  // An empty string or null clears the name.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;

  // The role in the current tenant.
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  // Staff only: false suspends the account's access to this tenant.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
