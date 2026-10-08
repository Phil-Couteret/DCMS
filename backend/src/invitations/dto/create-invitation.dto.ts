import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MembershipRole } from '../../generated/prisma/enums.js';

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}
