import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentTenantId } from '../tenant/tenant-context.js';
import { TenantsService } from '../tenant/tenants.service.js';
import { isStaffRole } from './staff-auth.guard.js';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({ email, passwordHash, name: dto.name });
    return { user, accessToken: await this.sign(user, await this.tokenTenant(user)) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.toLowerCase());
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tenantId = await this.tokenTenant(user);
    const { passwordHash: _, ...safe } = user;
    return { user: safe, accessToken: await this.sign(user, tenantId) };
  }

  // The tenant a new token is for. Staff and admins: their membership (the
  // request's tenant must be one of theirs; with several, the request must
  // name one until the "which center?" login of step 2). Customers: the
  // tenant of the site they sign in on.
  async tokenTenant(user: { id: string; role: string }) {
    const requested = currentTenantId();
    if (!isStaffRole(user.role)) {
      const tenantId = requested ?? (await this.tenants.singleActiveTenant());
      if (!tenantId) throw new UnauthorizedException('Sign in from your center\'s site');
      return tenantId;
    }
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, tenant: { isActive: true } },
      select: { tenantId: true },
    });
    const ids = memberships.map((m) => m.tenantId);
    if (requested) {
      if (!ids.includes(requested)) throw new UnauthorizedException('Invalid credentials');
      return requested;
    }
    if (ids.length === 1) return ids[0];
    if (ids.length === 0) throw new UnauthorizedException('This account has no access to any center');
    throw new ConflictException('This account works at several centers: choose one with the X-Tenant-ID header');
  }

  private sign(user: { id: string; email: string; role: string }, tenantId: string) {
    return this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, tenantId });
  }
}
