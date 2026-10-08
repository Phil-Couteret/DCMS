import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantsService } from '../tenant/tenants.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  // 'partner' on partner portal tokens, which only PartnerJwtGuard accepts.
  type?: string;
  // The tenant the token was issued for. Tokens issued before multi-tenancy
  // have none; see JwtStrategy.
  tenantId?: string;
}

export interface UserPrincipal {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
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
    // Partner tokens are signed with the same secret but are not user tokens:
    // they must never open staff or customer routes.
    if (payload.type === 'partner') throw new UnauthorizedException();
    let tenantId = payload.tenantId ?? null;
    if (!tenantId && payload.role !== 'CUSTOMER') {
      const memberships = await this.prisma.membership.findMany({
        where: { userId: payload.sub },
        select: { tenantId: true },
        take: 2,
      });
      if (memberships.length !== 1) throw new UnauthorizedException('Please sign in again');
      tenantId = memberships[0].tenantId;
    }
    if (tenantId) await this.tenants.useTokenTenant(tenantId);
    return { id: payload.sub, email: payload.email, role: payload.role, tenantId };
  }
}
