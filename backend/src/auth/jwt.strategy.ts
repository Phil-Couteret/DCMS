import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  // 'partner' on partner portal tokens, which only PartnerJwtGuard accepts.
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // Partner tokens are signed with the same secret but are not user tokens:
    // they must never open staff or customer routes.
    if (payload.type === 'partner') throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
