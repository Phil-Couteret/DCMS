import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { tenantStore } from '../tenant/tenant-context.js';
import { TenantsService } from '../tenant/tenants.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  // The role in the token's tenant: ADMIN or INSTRUCTOR (the membership's),
  // CUSTOMER, or SUPERADMIN on a platform token.
  role: string;
  // 'partner' on partner portal tokens (PartnerJwtGuard only), 'tenant-selection'
  // on the short-lived token of a login that must choose a center.
  type?: string;
  // The tenant the token was issued for; null on a superadmin's platform
  // token. Tokens issued before multi-tenancy have none; see JwtStrategy.
  tenantId?: string | null;
  tenantSlug?: string | null;
  isSuperadmin?: boolean;
}

export interface UserPrincipal {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  isSuperadmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly tenants: TenantsService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // The token's tenant becomes the request's tenant (a header naming another
  // one is refused). A token from before multi-tenancy gets its account's
  // only membership; with none or several it must sign in again.
  async validate(payload: JwtPayload): Promise<UserPrincipal> {
    // Partner and tenant-selection tokens are signed with the same secret but
    // are not user tokens: they must never open staff or customer routes.
    if (payload.type !== undefined) throw new UnauthorizedException();
    const isSuperadmin = payload.isSuperadmin === true;
    let tenantId = payload.tenantId ?? null;
    if (payload.tenantId === null && isSuperadmin) {
      // Platform token: no tenant, and none may be named by header.
      if (tenantStore()?.headerTenantId) {
        throw new ForbiddenException('Enter the center from the superadmin console first');
      }
    } else if (!tenantId && payload.role !== 'CUSTOMER') {
      const memberships = await this.prisma.membership.findMany({
        where: { userId: payload.sub, isActive: true },
        select: { tenantId: true },
        take: 2,
      });
      if (memberships.length !== 1) throw new UnauthorizedException('Please sign in again');
      tenantId = memberships[0].tenantId;
    }
    if (tenantId) await this.tenants.useTokenTenant(tenantId);
    return { id: payload.sub, email: payload.email, role: payload.role, tenantId, isSuperadmin };
  }
}
