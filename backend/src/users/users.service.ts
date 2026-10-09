import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { MembershipRole, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { usedByOtherTenants } from '../tenant/shared-accounts.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const BCRYPT_ROUNDS = 12;

// Never the password hash. staffId/customerId are the account's profiles in
// the current tenant, which block deleting it.
//
// User is a global model: the tenant extension does not filter it, so every
// query here names the tenant itself, including in nested selects.
function listSelect(tenantId: string) {
  return {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    staffProfiles: { where: { tenantId }, select: { id: true } },
    customers: { where: { tenantId }, select: { id: true } },
    memberships: { where: { tenantId }, select: { role: true, isActive: true } },
  } satisfies Prisma.UserSelect;
}

type ListedUser = Prisma.UserGetPayload<{ select: ReturnType<typeof listSelect> }>;

// role is the account's role in this tenant: its membership's for staff,
// CUSTOMER for the others. isActive is false for a deactivated membership.
function toView({ staffProfiles, customers, memberships, ...user }: ListedUser) {
  const membership = memberships.at(0);
  return {
    ...user,
    role: membership?.role ?? Role.CUSTOMER,
    isActive: membership?.isActive ?? true,
    staffId: staffProfiles[0]?.id ?? null,
    customerId: customers[0]?.id ?? null,
  };
}

const ROLE_ORDER: string[] = [Role.ADMIN, Role.INSTRUCTOR, Role.CUSTOMER];

function isMembershipRole(role: Role): role is MembershipRole {
  return role === Role.ADMIN || role === Role.INSTRUCTOR;
}

// Accounts linked to the tenant: staff and admins through a membership,
// customers through a customer profile.
function inTenant(tenantId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { memberships: { some: { tenantId } } },
      { customers: { some: { tenantId } } },
      { staffProfiles: { some: { tenantId } } },
    ],
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  // The global (staff or platform) account with this email.
  findGlobalByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, tenantId: null } });
  }

  // A tenant's customer account with this email.
  findCustomerAccount(tenantId: string, email: string) {
    return this.prisma.user.findFirst({ where: { email, tenantId } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isSuperadmin: true, createdAt: true },
    });
  }

  // tenantId: a customer account of that tenant; without, a global account.
  create(data: { email: string; passwordHash: string; name?: string; tenantId?: string }) {
    return this.prisma.user.create({
      data,
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async list(filters: { role?: string }) {
    if (filters.role && !Object.values(Role).includes(filters.role as Role)) {
      throw new BadRequestException('Unknown role');
    }
    const tenantId = this.tenant.tenantId;
    const users = await this.prisma.user.findMany({
      where: inTenant(tenantId),
      select: listSelect(tenantId),
      orderBy: { createdAt: 'asc' },
    });
    return users
      .map(toView)
      .filter((u) => !filters.role || u.role === filters.role)
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  }

  // Only accounts linked to the current tenant; any other is "not found".
  async findOne(id: string) {
    const tenantId = this.tenant.tenantId;
    const user = await this.prisma.user.findFirst({ where: { id, ...inTenant(tenantId) }, select: listSelect(tenantId) });
    if (!user) throw new NotFoundException('User not found');
    return toView(user);
  }

  // A new account with access to the current tenant. A staff account that
  // already exists (the person works at another center) is given access
  // here instead: its name and password stay as they are.
  async createAccount(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const tenantId = this.tenant.tenantId;
    const staff = isMembershipRole(dto.role);
    // Staff logins are global accounts; customer accounts (per tenant) with
    // the same email are separate.
    const existing = await this.prisma.user.findFirst({
      where: { email, tenantId: null },
      select: { id: true, role: true, isSuperadmin: true, memberships: { where: { tenantId }, select: { id: true } } },
    });
    if (existing) {
      const staffAccount = existing.role !== Role.CUSTOMER || existing.isSuperadmin;
      if (!staff || !staffAccount || existing.memberships.length > 0) {
        throw new ConflictException('A user with this email already exists');
      }
      await this.prisma.membership.create({ data: { userId: existing.id, tenantId, role: dto.role as MembershipRole } });
      return { ...(await this.findOne(existing.id)), existingAccount: true };
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name?.trim() || null,
          role: dto.role,
          ...(staff ? { memberships: { create: { tenantId, role: dto.role as MembershipRole } } } : {}),
        },
        select: listSelect(tenantId),
      });
      return { ...toView(user), existingAccount: false };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw e;
    }
  }

  // An account another center also uses is that person's, not this center's
  // to change. Its role and access here (the membership) are this center's.
  // A superadmin's account belongs to the platform: a center admin taking
  // it over (its password) would take over every center.
  private async assertOnlyHere(userId: string, what: string) {
    if (await this.isSuperadmin(userId)) {
      throw new BadRequestException(`This is a platform administrator account; its ${what} cannot be changed here`);
    }
    if (await usedByOtherTenants(this.prisma, userId, this.tenant.tenantId)) {
      throw new BadRequestException(`This account is also used by another center; its ${what} cannot be changed here`);
    }
  }

  // actorId is the admin making the change. Admins cannot change their own
  // role or deactivate themselves, so there is always at least one active
  // admin left: the one acting. Staff roles and activation are per tenant
  // (the membership); turning a customer into staff or back changes the
  // account itself, so only for accounts no other center uses.
  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const current = await this.findOne(id);
    const tenantId = this.tenant.tenantId;
    const roleChange = dto.role !== undefined && dto.role !== current.role;
    const activeChange = dto.isActive !== undefined && dto.isActive !== current.isActive;
    if (id === actorId && roleChange) throw new BadRequestException('You cannot change your own role');
    if (id === actorId && activeChange) throw new BadRequestException('You cannot deactivate your own access');
    const nameChange = dto.name !== undefined && (dto.name?.trim() || null) !== current.name;
    if (nameChange) await this.assertOnlyHere(id, 'name');
    const wasStaff = current.role !== Role.CUSTOMER;
    const toStaff = roleChange && isMembershipRole(dto.role!);
    if (roleChange && wasStaff !== toStaff) await this.assertOnlyHere(id, 'account type');
    // A customer account of this tenant becoming staff becomes a global
    // account: its email must not already have a staff login.
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { email: true, tenantId: true } });
    const toGlobal = toStaff && !wasStaff && account.tenantId !== null;
    if (toGlobal && (await this.findGlobalByEmail(account.email))) {
      throw new ConflictException('This email already has a staff login; give that account access instead');
    }
    if (activeChange && !wasStaff && !toStaff) throw new BadRequestException('Only staff access can be deactivated');

    await this.prisma.$transaction(async (tx) => {
      if (nameChange) await tx.user.update({ where: { id }, data: { name: dto.name?.trim() || null } });
      if (roleChange && wasStaff !== toStaff) {
        await tx.user.update({ where: { id }, data: { role: dto.role, ...(toGlobal && { tenantId: null }) } });
      }
      if (roleChange && !toStaff) {
        await tx.membership.deleteMany({ where: { userId: id, tenantId } });
      } else if (toStaff || (wasStaff && activeChange)) {
        const role = (toStaff ? dto.role : current.role) as MembershipRole;
        const isActive = dto.isActive ?? current.isActive;
        await tx.membership.upsert({
          where: { userId_tenantId: { userId: id, tenantId } },
          create: { userId: id, tenantId, role, isActive },
          update: { role, isActive },
        });
      }
    });
    return this.findOne(id);
  }

  // Deleting a user cascades to its staff or customer profiles, and through
  // them to bookings, invoices and dive logs, so only accounts without a
  // profile can be deleted. An account another center also uses only loses
  // access to this one.
  async remove(id: string, actorId: string) {
    if (id === actorId) throw new BadRequestException('You cannot delete your own account');
    const user = await this.findOne(id);
    if (user.staffId || user.customerId) {
      const profile = user.staffId ? 'a staff profile' : 'a customer profile';
      throw new ConflictException(`This user has ${profile} and cannot be deleted`);
    }
    const tenantId = this.tenant.tenantId;
    if ((await this.isSuperadmin(id)) || (await usedByOtherTenants(this.prisma, id, tenantId))) {
      await this.prisma.membership.deleteMany({ where: { userId: id, tenantId } });
      return user;
    }
    let count: number;
    try {
      ({ count } = await this.prisma.user.deleteMany({
        where: { id, staffProfiles: { none: {} }, customers: { none: {} } },
      }));
    } catch (e) {
      // Records that name the user as their author, such as data breaches.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('This user is recorded as the author of data breach records and cannot be deleted');
      }
      throw e;
    }
    if (count === 0) throw new ConflictException('This user now has a profile and cannot be deleted');
    return user;
  }

  private async isSuperadmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isSuperadmin: true } });
    return user?.isSuperadmin === true;
  }

  async setPassword(id: string, password: string) {
    await this.findOne(id);
    await this.assertOnlyHere(id, 'password');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }

  async changeOwnPassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }
}
