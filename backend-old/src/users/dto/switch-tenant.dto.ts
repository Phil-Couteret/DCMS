import { IsUUID } from 'class-validator';

/**
 * Post-login "switch center" action: the user is already authenticated
 * (valid JWT on the request), so unlike SelectTenantDto this doesn't need
 * credentials again - just the tenant to switch into, which UsersService
 * re-validates against the user's actual tenant/memberships before issuing
 * a new token.
 */
export class SwitchTenantDto {
  @IsUUID(4)
  tenantId: string;
}
