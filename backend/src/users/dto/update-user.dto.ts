import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class UpdateUserDto {
  // An empty string or null clears the name.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
