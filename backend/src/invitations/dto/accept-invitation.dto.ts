import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// A new account sends name and password; an existing one, currentPassword.
export class AcceptInvitationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignores anything longer
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPassword?: string;
}
