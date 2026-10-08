import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { runUnscoped } from '../tenant/tenant-context.js';
import { TenantsService } from '../tenant/tenants.service.js';

export interface PartnerPrincipal {
  partnerId: string;
  email: string;
}

// Partner portal tokens: same secret as user tokens, told apart by type.
// The partner is looked up on every request, so deactivating it signs it out.
@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(Strategy, 'partner-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<PartnerPrincipal> {
    if (payload.type !== 'partner') throw new UnauthorizedException();
    // The partner's tenant becomes the request's. Tokens from before
    // multi-tenancy carry none: it is the partner's own.
    const tenantId =
      payload.tenantId ??
      (await runUnscoped(() => this.prisma.partner.findUnique({ where: { id: payload.sub }, select: { tenantId: true } })))
        ?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    await this.tenants.useTokenTenant(tenantId);
    const partner = await this.prisma.partner.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, contactEmail: true },
    });
    if (!partner?.isActive) throw new UnauthorizedException();
    return { partnerId: payload.sub, email: partner.contactEmail };
  }
}
