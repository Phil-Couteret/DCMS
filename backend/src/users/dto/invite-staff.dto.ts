import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MembershipRole } from '../../generated/prisma/enums.js';

// Settings → Users → Invite: who, and their role at this center. The person
// sets their own name and password when they open the link.
export class InviteStaffDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsEnum(MembershipRole)
  role: MembershipRole;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
