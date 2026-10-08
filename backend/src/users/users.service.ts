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
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const BCRYPT_ROUNDS = 12;

// Never the password hash. staff/customer say whether the account has a
// profile, which blocks deleting it.
const LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  staff: { select: { id: true } },
  customer: { select: { id: true } },
} satisfies Prisma.UserSelect;

type ListedUser = Prisma.UserGetPayload<{ select: typeof LIST_SELECT }>;

function toView({ staff, customer, ...user }: ListedUser) {
  return { ...user, staffId: staff?.id ?? null, customerId: customer?.id ?? null };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const users = await this.prisma.user.findMany({
      where: filters.role ? { role: filters.role as Role } : {},
      select: LIST_SELECT,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return users.map(toView);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: LIST_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return toView(user);
  }

  async createAccount(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, name: dto.name?.trim() || null, role: dto.role },
        select: LIST_SELECT,
      });
      return toView(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw e;
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
    const user = await this.prisma.user.update({ where: { id }, data, select: LIST_SELECT });
    return toView(user);
  }

  // Deleting a user cascades to its staff or customer profile, and through
  // them to bookings, invoices and dive logs, so only accounts without a
  // profile can be deleted. The check is part of the delete itself.
  async remove(id: string, actorId: string) {
    if (id === actorId) throw new BadRequestException('You cannot delete your own account');
    const user = await this.findOne(id);
    const { count } = await this.prisma.user.deleteMany({
      where: { id, staff: { is: null }, customer: { is: null } },
    });
    if (count === 0) {
      const profile = user.staffId ? 'a staff profile' : 'a customer profile';
      throw new ConflictException(`This user has ${profile} and cannot be deleted`);
    }
    return user;
  }

  async setPassword(id: string, password: string) {
    await this.findOne(id);
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
