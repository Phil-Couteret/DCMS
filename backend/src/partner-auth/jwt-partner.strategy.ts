import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PartnerAuthService, PartnerJwtPayload } from './partner-auth.service';

@Injectable()
export class JwtPartnerStrategy extends PassportStrategy(Strategy, 'jwt-partner') {
  constructor(private partnerAuthService: PartnerAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: PartnerJwtPayload) {
    const partner = await this.partnerAuthService.validatePartnerFromToken(payload);
    if (!partner) {
      throw new UnauthorizedException();
    }
    // Return partner directly so it's available as request.user
    return partner;
  }
}
