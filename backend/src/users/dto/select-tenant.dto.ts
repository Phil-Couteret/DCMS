import { IsString, IsUUID, MinLength } from 'class-validator';

/**
 * Second step of login for a user with 2+ tenant memberships (see
 * UsersService.login/selectTenant). Re-checks username/password rather than
 * introducing a separate short-lived "pending" token type - simpler to
 * reason about, and the added cost is one extra bcrypt.compare().
 */
export class SelectTenantDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsUUID(4)
  tenantId: string;
}
