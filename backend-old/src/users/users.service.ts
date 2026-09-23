import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import * as bcrypt from 'bcrypt';
import { user_role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';

export { CreateUserDto, UpdateUserDto, LoginDto, SelectTenantDto, SwitchTenantDto };

interface TenantOption {
  tenantId: string;
  role: user_role;
  permissions: string[];
  locationAccess: string[];
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private tenantContext: TenantContextService,
  ) {}

  async findAll() {
    const users = await this.prisma.users.findMany({
      orderBy: { created_at: 'desc' },
    });
    return users.map(({ password_hash, ...user }) => user);
  }

  private static readonly UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  async findOne(id: string) {
    if (!UsersService.UUID_REGEX.test(id)) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  /**
   * Every tenant this user can log into: their primary users.tenant_id
   * (if set) plus any active user_tenant_memberships rows. A regular staff
   * member with only one tenant (still the common case) gets exactly one
   * option here and login proceeds with zero extra friction.
   */
  private async getTenantOptions(user: {
    id: string;
    tenant_id: string | null;
    role: user_role;
    permissions: string[];
    location_access: string[];
  }): Promise<TenantOption[]> {
    const options: TenantOption[] = [];
    if (user.tenant_id) {
      options.push({
        tenantId: user.tenant_id,
        role: user.role,
        permissions: user.permissions,
        locationAccess: user.location_access,
      });
    }
    const memberships = await this.prisma.user_tenant_memberships.findMany({
      where: { user_id: user.id, is_active: true },
    });
    for (const m of memberships) {
      options.push({
        tenantId: m.tenant_id,
        role: m.role,
        permissions: m.permissions,
        locationAccess: m.location_access,
      });
    }
    return options;
  }

  /** Signs the JWT and builds the login response for one chosen tenant option (or null/superadmin). */
  private async issueSession(
    user: { id: string; username: string; role: user_role; [key: string]: unknown },
    tenantId: string | null,
    role: user_role,
    permissions: string[],
    locationAccess?: string[],
  ) {
    const accessToken = this.authService.signAdminToken({
      sub: user.id,
      username: user.username,
      tenantId,
      role,
      permissions,
    });

    const { password_hash, tenant_id, ...userRest } = user as Record<string, unknown> & { password_hash?: unknown; tenant_id?: unknown };
    let tenantSlug: string | null = null;
    if (tenantId) {
      const tenant = await this.prisma.tenants.findUnique({ where: { id: tenantId } });
      tenantSlug = tenant?.slug ?? null;
    }

    return {
      user: {
        ...userRest,
        tenant_id: tenantId,
        role,
        permissions,
        ...(locationAccess !== undefined && { location_access: locationAccess }),
        tenantSlug,
      },
      access_token: accessToken,
    };
  }

  private async describeTenantOptions(options: TenantOption[]) {
    const tenants = await this.prisma.tenants.findMany({
      where: { id: { in: options.map((o) => o.tenantId) } },
    });
    const byId = new Map(tenants.map((t) => [t.id, t]));
    return options.map((o) => ({
      tenantId: o.tenantId,
      slug: byId.get(o.tenantId)?.slug ?? null,
      name: byId.get(o.tenantId)?.name ?? null,
      role: o.role,
    }));
  }

  private async verifyCredentials(username: string, password: string) {
    const user = await this.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.verifyCredentials(loginDto.username, loginDto.password);

    if (user.role === 'superadmin') {
      // Unchanged from before: superadmin has no tenant of its own and
      // switches tenants post-login via header/subdomain (tenant.interceptor.ts).
      return this.issueSession(user, null, user.role, user.permissions, user.location_access);
    }

    const options = await this.getTenantOptions(user);
    if (options.length === 0) {
      throw new UnauthorizedException('User is not assigned to any tenant');
    }

    // A subdomain/header already narrowed the request to one tenant - if it
    // matches one of this user's tenants, log straight into it (same
    // zero-friction behavior as before this feature existed). If it names a
    // tenant the user has no access to, reject exactly as before.
    const contextTenantId = this.tenantContext.getTenantId();
    if (contextTenantId) {
      const match = options.find((o) => o.tenantId === contextTenantId);
      if (!match) {
        throw new UnauthorizedException('User does not belong to this tenant');
      }
      return this.issueSession(user, match.tenantId, match.role, match.permissions, match.locationAccess);
    }

    if (options.length === 1) {
      const only = options[0];
      return this.issueSession(user, only.tenantId, only.role, only.permissions, only.locationAccess);
    }

    // 2+ tenants and nothing narrowed it down - let the client choose rather
    // than guessing. No token is issued at this step.
    return {
      requiresTenantSelection: true,
      tenants: await this.describeTenantOptions(options),
    };
  }

  /** Completes login once the client has picked a tenant from the list `login()` returned. */
  async selectTenant(dto: SelectTenantDto) {
    const user = await this.verifyCredentials(dto.username, dto.password);

    if (user.role === 'superadmin') {
      throw new UnauthorizedException('Superadmin accounts do not use tenant selection');
    }

    const options = await this.getTenantOptions(user);
    const chosen = options.find((o) => o.tenantId === dto.tenantId);
    if (!chosen) {
      throw new UnauthorizedException('User does not belong to this tenant');
    }

    return this.issueSession(user, chosen.tenantId, chosen.role, chosen.permissions, chosen.locationAccess);
  }

  /**
   * Post-login "switch center": the request is already authenticated (a
   * valid JWT got it past the guard), so unlike selectTenant() this doesn't
   * ask for credentials again - it just re-validates that the tenant being
   * switched into is one this specific user actually has access to (their
   * primary tenant or an active membership) and issues a fresh JWT scoped
   * to it. Superadmins already have their own cross-tenant switch mechanism
   * (X-Tenant-ID/subdomain, see tenant.interceptor.ts) and don't use this.
   */
  async switchTenant(userId: string, tenantId: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }
    if (user.role === 'superadmin') {
      throw new UnauthorizedException('Superadmins switch tenants via the tenant selector, not this endpoint');
    }

    const options = await this.getTenantOptions(user);
    const chosen = options.find((o) => o.tenantId === tenantId);
    if (!chosen) {
      throw new UnauthorizedException('User does not have access to this tenant');
    }

    return this.issueSession(user, chosen.tenantId, chosen.role, chosen.permissions, chosen.locationAccess);
  }

  /** Grants a user access to an additional tenant, with its own role/permissions there. */
  async addTenantMembership(
    userId: string,
    tenantId: string,
    role: user_role = 'admin',
    permissions: string[] = [],
    locationAccess: string[] = [],
  ) {
    await this.findOne(userId); // 404s if the user doesn't exist
    const tenant = await this.prisma.tenants.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }
    return this.prisma.user_tenant_memberships.upsert({
      where: { user_id_tenant_id: { user_id: userId, tenant_id: tenantId } },
      create: { user_id: userId, tenant_id: tenantId, role, permissions, location_access: locationAccess, is_active: true },
      update: { role, permissions, location_access: locationAccess, is_active: true },
    });
  }

  /** Revokes a user's access to a (non-primary) tenant. */
  async removeTenantMembership(userId: string, tenantId: string) {
    await this.prisma.user_tenant_memberships.deleteMany({
      where: { user_id: userId, tenant_id: tenantId },
    });
    return { message: 'Membership removed' };
  }

  /** Lists every tenant a user can access - their primary plus all memberships. */
  async listTenantMemberships(userId: string) {
    const user = await this.findOne(userId);
    const options = await this.getTenantOptions({
      id: userId,
      tenant_id: (user as any).tenant_id,
      role: (user as any).role,
      permissions: (user as any).permissions,
      location_access: (user as any).location_access,
    });
    return this.describeTenantOptions(options);
  }

  async create(dto: CreateUserDto) {
    // Check if username already exists
    const existingUsername = await this.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException(`User with username ${dto.username} already exists`);
    }

    // Check if email already exists (if provided)
    if (dto.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        username: dto.username,
        name: dto.name,
        email: dto.email || null,
        password_hash: passwordHash,
        role: dto.role || 'admin',
        permissions: dto.permissions || [],
        location_access: dto.locationAccess || [],
        is_active: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // Check if exists

    // Check if username is being changed and already exists
    if (dto.username) {
      const existingUsername = await this.findByUsername(dto.username);
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException(`User with username ${dto.username} already exists`);
      }
    }

    // Check if email is being changed and already exists
    if (dto.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    const updateData: any = {};
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email || null;
    if (dto.password !== undefined) {
      updateData.password_hash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;
    if (dto.locationAccess !== undefined) updateData.location_access = dto.locationAccess;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const user = await this.prisma.users.update({
      where: { id },
      data: updateData,
    });

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: string) {
    await this.findOne(id);
    const user = await this.prisma.users.delete({
      where: { id },
    });
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

