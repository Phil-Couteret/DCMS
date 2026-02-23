import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminJwtPayload } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: AdminJwtPayload) {
    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return {
      id: user.id,
      username: user.username,
      tenantId: payload.tenantId ?? user.tenant_id,
      role: user.role,
      permissions: user.permissions,
    };
  }
}
