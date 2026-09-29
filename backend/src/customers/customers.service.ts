import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { Language, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

// Customers are returned with their account's email flattened in.
const WITH_EMAIL = { user: { select: { email: true } } } satisfies Prisma.CustomerInclude;

function withEmail<T extends { user: { email: string } }>({ user, ...customer }: T) {
  return { ...customer, email: user.email };
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { country?: string; language?: Language } = {}) {
    const customers = await this.prisma.customer.findMany({
      where: {
        ...(filters.country && { country: filters.country }),
        ...(filters.language && { language: filters.language }),
      },
      include: WITH_EMAIL,
      orderBy: { createdAt: 'desc' },
    });
    return customers.map(withEmail);
  }

  // The last 10 dive logs this customer took part in, newest first.
  async diveHistory(id: string) {
    await this.findOne(id);
    const entries = await this.prisma.diveLogParticipant.findMany({
      where: { customerId: id },
      orderBy: [{ diveLog: { date: 'desc' } }, { diveLog: { entryTime: 'desc' } }],
      take: 10,
      select: {
        role: true,
        diveLog: {
          select: {
            id: true,
            logNumber: true,
            date: true,
            siteId: true,
            maxDepth: true,
            duration: true,
            site: { select: { nameEn: true } },
          },
        },
      },
    });
    return entries.map(({ role, diveLog }) => ({
      diveLogId: diveLog.id,
      logNumber: diveLog.logNumber,
      date: diveLog.date,
      siteId: diveLog.siteId,
      siteName: diveLog.site.nameEn,
      maxDepth: diveLog.maxDepth,
      duration: diveLog.duration,
      role,
    }));
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, include: WITH_EMAIL });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return withEmail(customer);
  }

  async create(dto: CreateCustomerDto) {
    const { email, userId, ...fields } = dto;
    if (!userId === !email) throw new BadRequestException('Give either userId or email');
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const ownerId = userId ?? (await accountFor(tx, email!.toLowerCase()));
        return tx.customer.create({
          data: { ...toData(fields), userId: ownerId } as Prisma.CustomerUncheckedCreateInput,
          include: WITH_EMAIL,
        });
      });
      return withEmail(customer);
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const current = await this.prisma.customer.findUnique({
      where: { id },
      select: { userId: true, user: { select: { email: true, role: true } } },
    });
    if (!current) throw new NotFoundException(`Customer ${id} not found`);
    const { email, ...fields } = dto;
    const newEmail = email?.toLowerCase();
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        if (newEmail && newEmail !== current.user.email) {
          // A staff member's customer profile shares their login; its email
          // is not changed from here.
          if (current.user.role !== Role.CUSTOMER) {
            throw new BadRequestException("This customer's email is also a staff login and cannot be changed here");
          }
          const taken = await tx.user.findUnique({ where: { email: newEmail }, select: { id: true } });
          if (taken) throw new ConflictException('Another account already uses this email');
          await tx.user.update({ where: { id: current.userId }, data: { email: newEmail } });
        }
        return tx.customer.update({ where: { id }, data: toData(fields), include: WITH_EMAIL });
      });
      return withEmail(customer);
    } catch (e) {
      throw mapError(e);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('This customer has bookings or dive log entries and cannot be deleted');
      }
      throw e;
    }
  }
}

// The account for a new customer: an existing one without a customer profile,
// or a new CUSTOMER account that cannot be signed in to (as for guest
// bookings: a random UUID never matches a bcrypt hash).
async function accountFor(tx: Tx, email: string) {
  const user = await tx.user.findUnique({
    where: { email },
    select: { id: true, customer: { select: { id: true } } },
  });
  if (user?.customer) throw new ConflictException('A customer with this email already exists');
  if (user) return user.id;
  const created = await tx.user.create({
    data: { email, passwordHash: randomUUID(), role: Role.CUSTOMER },
    select: { id: true },
  });
  return created.id;
}

function toData(dto: Omit<UpdateCustomerDto, 'email'>): Prisma.CustomerUncheckedUpdateInput {
  const { birthdate, certificationExpiry, emergencyContact, ...rest } = dto;
  return {
    ...rest,
    // null clears any of these fields.
    ...(birthdate !== undefined && { birthdate: birthdate === null ? null : new Date(birthdate) }),
    ...(certificationExpiry !== undefined && {
      certificationExpiry: certificationExpiry === null ? null : new Date(certificationExpiry),
    }),
    ...(emergencyContact !== undefined && {
      emergencyContact: emergencyContact === null ? Prisma.DbNull : (emergencyContact as Prisma.InputJsonValue),
    }),
  };
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return new ConflictException('This user already has a customer profile');
    if (e.code === 'P2003') return new BadRequestException('userId does not match an existing user');
  }
  return e;
}
