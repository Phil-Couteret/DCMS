import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignores anything longer
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsEnum(Role)
  role: Role;
}
