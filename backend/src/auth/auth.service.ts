import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AdminJwtPayload {
  sub: string;
  username: string;
  tenantId: string | null;
  role: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  signAdminToken(payload: AdminJwtPayload): string {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  verifyAdminToken(token: string): AdminJwtPayload {
    return this.jwtService.verify<AdminJwtPayload>(token);
  }
}
