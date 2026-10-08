import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DEFAULT_SETTINGS } from '../config/tenant-defaults.js';
import bcrypt from 'bcrypt';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { recordPlatformAction } from '../superadmin/audit.js';
import { currentTenantId } from '../tenant/tenant-context.js';
import { TenantsService } from '../tenant/tenants.service.js';
import { UsersService } from '../users/users.service.js';
import { isStaffRole } from './staff-auth.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

// How long a login has to choose its center.
const SELECTION_TTL = '5m';
const SELECTION_TYPE = 'tenant-selection';

type Account = { id: string; email: string; name: string | null; role: Role; isSuperadmin: boolean };

const accountSelect = { id: true, email: true, name: true, role: true, isSuperadmin: true } as const;

// A center a staff account may sign in to, with its role there. member is
// false for a superadmin entering a tenant they have no membership in.
export interface TenantOption {
  id: string;
  slug: string;
  name: string;
  role: string;
  member: boolean;
}

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
    const created = await this.users.create({ email, passwordHash, name: dto.name });
    const user = await this.account(created.id);
    // The very first account is the platform's superadmin (database trigger):
    // it signs in like any other staff account, to the console.
    if (user.isSuperadmin) return this.staffLogin(user);
    const tenantId = await this.customerTenant();
    return this.issue(user, { tenantId, role: Role.CUSTOMER });
  }

  // Staff with one center (or a superadmin with none) get a token at once.
  // With several choices the reply is { requiresTenantSelection, tenants,
  // selectionToken } and the login finishes with selectTenant. Customers
  // get a token for the tenant of the site they sign in on.
  async login(dto: LoginDto) {
    const found = await this.users.findByEmail(dto.email.toLowerCase());
    if (!found || !(await bcrypt.compare(dto.password, found.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = await this.account(found.id);
    if (!(await this.isStaffAccount(user))) {
      return this.issue(user, { tenantId: await this.customerTenant(), role: Role.CUSTOMER });
    }
    return this.staffLogin(user);
  }

  async selectTenant(selectionToken: string, tenantId: string | null) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(selectionToken);
    } catch {
      throw new UnauthorizedException('The sign-in has expired: sign in again');
    }
    if (payload.type !== SELECTION_TYPE) throw new UnauthorizedException();
    return this.enter(await this.account(payload.sub), tenantId);
  }

  // A signed-in staff member or superadmin moving to another center (or a
  // superadmin to the platform console): a new token, same checks as login.
  async switchTenant(userId: string, tenantId: string | null) {
    const user = await this.account(userId);
    if (!(await this.isStaffAccount(user))) throw new ForbiddenException('Staff access only');
    return this.enter(user, tenantId);
  }

  // The centers the signed-in account can switch to.
  async availableTenants(userId: string) {
    const user = await this.account(userId);
    return { tenants: await this.tenantOptions(user), platform: user.isSuperadmin };
  }

  // The signed-in account, with its role and tenant for this token.
  async me(principal: { id: string; role: string; tenantId: string | null }) {
    const user = await this.users.findById(principal.id);
    if (!user) throw new UnauthorizedException();
    const row = principal.tenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: principal.tenantId },
          select: { id: true, slug: true, name: true, centerSettings: { select: { timeZone: true, currency: true } } },
        })
      : null;
    // The center's time zone and currency, which the backoffice displays in.
    const tenant = row && {
      id: row.id,
      slug: row.slug,
      name: row.name,
      timeZone: row.centerSettings?.timeZone ?? DEFAULT_SETTINGS.timeZone,
      currency: row.centerSettings?.currency ?? DEFAULT_SETTINGS.currency,
    };
    let role = principal.role;
    if (tenant && role !== Role.CUSTOMER) {
      const membership = await this.prisma.membership.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
        select: { role: true, isActive: true },
      });
      role = membership?.isActive ? membership.role : user.isSuperadmin ? Role.ADMIN : role;
    }
    return { ...user, role, tenant };
  }

  // The choices are the account's own centers, plus the console for a
  // superadmin, who enters other tenants from there.
  private async staffLogin(user: Account) {
    // Transitional: a request naming its tenant (X-Tenant-ID) signs in there.
    const requested = currentTenantId();
    if (requested) return this.enter(user, requested);
    const options = (await this.tenantOptions(user)).filter((t) => t.member);

    const choices = options.length + (user.isSuperadmin ? 1 : 0);
    if (choices === 0) throw new UnauthorizedException('This account has no access to any center');
    if (choices === 1) return this.enter(user, options[0]?.id ?? null);
    const { id, email, name, isSuperadmin } = user;
    return {
      requiresTenantSelection: true as const,
      user: { id, email, name, isSuperadmin },
      tenants: options,
      // The superadmin's platform console is one more choice.
      platform: isSuperadmin,
      selectionToken: await this.jwt.signAsync({ sub: user.id, type: SELECTION_TYPE }, { expiresIn: SELECTION_TTL }),
    };
  }

  // A token for tenantId (null: the platform console). Members get their
  // membership's role; a superadmin may enter any active tenant as its
  // admin, and every such entry is audited.
  private async enter(user: Account, tenantId: string | null) {
    if (tenantId === null) {
      if (!user.isSuperadmin) throw new ForbiddenException('Choose a center');
      return this.issue(user, { tenantId: null, role: 'SUPERADMIN' });
    }
    const option = (await this.tenantOptions(user)).find((t) => t.id === tenantId);
    if (!option) throw new ForbiddenException('No access to this center');
    if (!option.member) {
      await recordPlatformAction(this.prisma, { userId: user.id, action: 'tenant.enter', tenantId });
    }
    return this.issue(user, { tenantId, role: option.role, tenantSlug: option.slug, tenantName: option.name });
  }

  // Active memberships in active tenants. A superadmin can enter every
  // active tenant: their memberships first, then the others, as admin.
  private async tenantOptions(user: Account): Promise<TenantOption[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, isActive: true, tenant: { isActive: true } },
      select: { role: true, tenant: { select: { id: true, slug: true, name: true } } },
      orderBy: { tenant: { name: 'asc' } },
    });
    const options: TenantOption[] = memberships.map((m) => ({ ...m.tenant, role: m.role, member: true }));
    if (!user.isSuperadmin) return options;
    const others = await this.prisma.tenant.findMany({
      where: { isActive: true, id: { notIn: options.map((o) => o.id) } },
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });
    return [...options, ...others.map((t) => ({ ...t, role: Role.ADMIN, member: false }))];
  }

  // Staff accounts sign in to a center through a membership. Customer
  // accounts have none and are not superadmins.
  private async isStaffAccount(user: Account) {
    if (user.isSuperadmin || isStaffRole(user.role)) return true;
    return (await this.prisma.membership.count({ where: { userId: user.id } })) > 0;
  }

  // Customers: the tenant of the site they sign in on.
  private async customerTenant() {
    const tenantId = currentTenantId() ?? (await this.tenants.singleActiveTenant());
    if (!tenantId) throw new UnauthorizedException('Sign in from your center\'s site');
    return tenantId;
  }

  private async account(id: string): Promise<Account> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: accountSelect });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  private async issue(
    user: Account,
    t: { tenantId: string | null; role: string; tenantSlug?: string; tenantName?: string },
  ) {
    let tenant: { id: string; slug: string; name: string } | null = null;
    if (t.tenantId) {
      tenant =
        t.tenantSlug && t.tenantName
          ? { id: t.tenantId, slug: t.tenantSlug, name: t.tenantName }
          : await this.prisma.tenant.findUniqueOrThrow({ where: { id: t.tenantId }, select: { id: true, slug: true, name: true } });
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: t.role,
      tenantId: t.tenantId,
      tenantSlug: tenant?.slug ?? null,
      isSuperadmin: user.isSuperadmin,
    });
    return { user: { ...user, role: t.role }, tenant, accessToken };
  }
}
