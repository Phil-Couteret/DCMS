import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
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
    role: true,
    createdAt: true,
    updatedAt: true,
    staffProfiles: { where: { tenantId }, select: { id: true } },
    customers: { where: { tenantId }, select: { id: true } },
  } satisfies Prisma.UserSelect;
}

type ListedUser = Prisma.UserGetPayload<{ select: ReturnType<typeof listSelect> }>;

function toView({ staffProfiles, customers, ...user }: ListedUser) {
  return { ...user, staffId: staffProfiles[0]?.id ?? null, customerId: customers[0]?.id ?? null };
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

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  create(data: { email: string; passwordHash: string; name?: string }) {
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
      where: { AND: [inTenant(tenantId), filters.role ? { role: filters.role as Role } : {}] },
      select: listSelect(tenantId),
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return users.map(toView);
  }

  // Only accounts linked to the current tenant; any other is "not found".
  async findOne(id: string) {
    const tenantId = this.tenant.tenantId;
    const user = await this.prisma.user.findFirst({ where: { id, ...inTenant(tenantId) }, select: listSelect(tenantId) });
    if (!user) throw new NotFoundException('User not found');
    return toView(user);
  }

  // A new account with access to the current tenant.
  async createAccount(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const tenantId = this.tenant.tenantId;
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name?.trim() || null,
          role: dto.role,
          memberships: { create: { tenantId } },
        },
        select: listSelect(tenantId),
      });
      return toView(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw e;
    }
  }

  // An account another center also uses is that person's, not this center's
  // to change. (Per-tenant roles come with memberships in step 2.)
  private async assertOnlyHere(userId: string, what: string) {
    if (await usedByOtherTenants(this.prisma, userId, this.tenant.tenantId)) {
      throw new BadRequestException(`This account is also used by another center; its ${what} cannot be changed here`);
    }
  }

  // actorId is the admin making the change. Admins cannot change their own
  // role, so there is always at least one admin left: the one acting.
  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const current = await this.findOne(id);
    if (dto.role !== undefined && dto.role !== current.role && id === actorId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name?.trim() || null;
    if (dto.role !== undefined) data.role = dto.role;
    const changes = (data.name !== undefined && data.name !== current.name) || (data.role !== undefined && data.role !== current.role);
    if (changes) await this.assertOnlyHere(id, 'name and role');
    const user = await this.prisma.user.update({ where: { id }, data, select: listSelect(this.tenant.tenantId) });
    return toView(user);
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
    if (await usedByOtherTenants(this.prisma, id, tenantId)) {
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
