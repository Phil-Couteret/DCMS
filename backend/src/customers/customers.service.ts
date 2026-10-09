import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { isEmail } from 'class-validator';
import { csvDate, csvRecords, type ImportResult, type UploadedFileData } from '../common/csv.js';
import { CustomerType, Language, Role, SkillLevel } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { usedByOtherTenants } from '../tenant/shared-accounts.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { requireTenantId } from '../tenant/tenant-context.js';
import { centerToday } from '../financial/center-day.js';
import { deleteCustomerFolder } from './document-storage.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
    private readonly config: TenantConfig,
  ) {}

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
    // Without a language, the center's default.
    fields.language ??= (await this.config.get()).defaultLanguage;
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
      select: {
        userId: true,
        user: { select: { email: true, role: true } },
        ...VERIFIED_DETAILS_SELECT,
      },
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
          if (await usedByOtherTenants(tx, current.userId, this.tenant.tenantId)) {
            throw new BadRequestException(
              "This customer's account is also used by another center; its email can only be changed by them",
            );
          }
          const taken = await tx.user.findUnique({ where: { email: newEmail }, select: { id: true } });
          if (taken) throw new ConflictException('Another account already uses this email');
          await tx.user.update({ where: { id: current.userId }, data: { email: newEmail } });
        }
        return tx.customer.update({
          where: { id },
          data: { ...toData(fields), ...staleVerifications(fields, current) },
          include: WITH_EMAIL,
        });
      });
      return withEmail(customer);
    } catch (e) {
      throw mapError(e);
    }
  }

  async import(file: UploadedFileData | undefined) {
    const [config, timeZone] = await Promise.all([this.config.get(), this.config.timeZone()]);
    return importCustomers(this.prisma, file, config.defaultLanguage, centerToday(timeZone));
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      const deleted = await this.prisma.customer.delete({ where: { id } });
      // Their documents' rows went with them; now their files.
      await deleteCustomerFolder(requireTenantId(), id);
      return deleted;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('This customer has bookings or dive log entries and cannot be deleted');
      }
      throw e;
    }
  }
}

// Customers from a CSV file (Customers → Import CSV): one per row, with a
// certification when the row names one. A row whose email is already a
// customer here (or earlier in the file) is skipped; a row with a problem is
// reported, and the others are still imported.
export const IMPORT_COLUMNS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'dob',
  'nationality',
  'gender',
  'customerType',
  'centerSkillLevel',
  'certificationLevel',
  'certificationAgency',
] as const;

export async function importCustomers(
  prisma: PrismaService,
  file: UploadedFileData | undefined,
  defaultLanguage: Language,
  today: string,
): Promise<ImportResult> {
  const { columns, records } = csvRecords(file);
  const missing = ['firstName', 'lastName', 'email', 'nationality'].filter((c) => !columns.has(c.toLowerCase()));
  if (missing.length > 0) throw new BadRequestException(`The CSV file needs these columns: ${missing.join(', ')}`);

  const existing = await prisma.customer.findMany({ select: { user: { select: { email: true } } } });
  const seen = new Set(existing.map((c) => c.user.email));
  const result: ImportResult = { imported: 0, skipped: [], errors: [] };

  for (const r of records) {
    const problems: string[] = [];
    const text = (column: string, max: number, required = false) => {
      const value = r.get(column);
      if (!value && required) problems.push(`${column} is missing`);
      if (value && value.length > max) problems.push(`${column} is over ${max} characters`);
      return value;
    };
    const firstName = text('firstName', 100, true);
    const lastName = text('lastName', 100, true);
    // A two-letter country code, as the customer forms store it.
    const nationality = r.get('nationality');
    if (!nationality) problems.push('nationality is missing');
    else if (!/^[A-Za-z]{2}$/.test(nationality)) problems.push(`nationality "${nationality}" is not a two-letter country code (DE, ES, GB…)`);
    const country = nationality?.toUpperCase();
    const phone = text('phone', 40);
    const gender = text('gender', 30);
    const email = r.get('email')?.toLowerCase();
    if (!email) problems.push('email is missing');
    else if (!isEmail(email) || email.length > 254) problems.push(`email "${email}" is not an email address`);
    const dobText = r.get('dob');
    const birthdate = dobText ? csvDate(dobText) : undefined;
    if (dobText && (!birthdate || birthdate > today)) problems.push(`dob "${dobText}" is not a past date (DD/MM/YYYY or YYYY-MM-DD)`);
    const choice = <T extends string>(column: string, values: Record<string, T>) => {
      const value = r.get(column);
      if (!value) return undefined;
      const match = Object.values(values).find((v) => v === value.toUpperCase());
      if (!match) problems.push(`${column} "${value}" is not one of ${Object.values(values).join(', ')}`);
      return match;
    };
    const customerType = choice('customerType', CustomerType);
    const centerSkillLevel = choice('centerSkillLevel', SkillLevel);
    const level = text('certificationLevel', 60);
    const agency = text('certificationAgency', 60);
    if (!level !== !agency) problems.push('give both certificationLevel and certificationAgency, or neither');

    if (problems.length > 0) {
      result.errors.push({ line: r.line, message: problems.join('; ') });
      continue;
    }
    if (seen.has(email!)) {
      result.skipped.push({ line: r.line, reason: `${email} is already a customer` });
      continue;
    }
    seen.add(email!);
    try {
      await prisma.$transaction(async (tx) => {
        const userId = await accountFor(tx, email!);
        const customer = await tx.customer.create({
          data: {
            userId,
            firstName: firstName!,
            lastName: lastName!,
            country: country!,
            phone: phone ?? null,
            gender: gender ?? null,
            birthdate: birthdate ? new Date(birthdate) : null,
            language: defaultLanguage,
            ...(customerType && { customerType }),
            ...(centerSkillLevel && { centerSkillLevel }),
          } as Prisma.CustomerUncheckedCreateInput,
          select: { id: true },
        });
        if (level && agency) {
          await tx.customerCertification.create({ data: { customerId: customer.id, agency, level } });
        }
      });
      result.imported++;
    } catch (e) {
      if (e instanceof ConflictException) result.skipped.push({ line: r.line, reason: `${email} is already a customer` });
      else result.errors.push({ line: r.line, message: e instanceof BadRequestException ? e.message : 'could not be saved' });
    }
  }
  return result;
}

// The account for a new customer: an existing one without a customer profile,
// or a new CUSTOMER account that cannot be signed in to (as for guest
// bookings: a random UUID never matches a bcrypt hash).
async function accountFor(tx: Tx, email: string) {
  const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
  // This tenant's profile only: a profile at another center is separate.
  if (user && (await tx.customer.findFirst({ where: { userId: user.id }, select: { id: true } }))) {
    throw new ConflictException('A customer with this email already exists');
  }
  if (user) return user.id;
  const created = await tx.user.create({
    data: { email, passwordHash: randomUUID(), role: Role.CUSTOMER },
    select: { id: true },
  });
  return created.id;
}

// Date fields arrive as ISO strings; null clears one.
const DATE_FIELDS = [
  'birthdate',
  'medicalCertExpiry',
  'medicalCertVerifiedAt',
  'insuranceExpiry',
  'insuranceVerifiedAt',
] as const;

function toData(dto: Omit<UpdateCustomerDto, 'email'>): Prisma.CustomerUncheckedUpdateInput {
  const { emergencyContact, ...rest } = dto;
  const data: Record<string, unknown> = { ...rest };
  for (const field of DATE_FIELDS) {
    const value = dto[field];
    if (value !== undefined) data[field] = value === null ? null : new Date(value);
  }
  if (emergencyContact !== undefined) {
    data.emergencyContact = emergencyContact === null ? Prisma.DbNull : (emergencyContact as Prisma.InputJsonValue);
  }
  return data as Prisma.CustomerUncheckedUpdateInput;
}

// A verification covers the details staff checked: when any of them changes,
// it is cleared, unless the same request sets it.
const VERIFIED_DETAILS = {
  medicalCertVerifiedAt: ['medicalCertNumber', 'medicalCertExpiry'],
  insuranceVerifiedAt: ['insuranceProvider', 'insurancePolicyNumber', 'insuranceExpiry'],
} as const;

type VerifiedDetail = (typeof VERIFIED_DETAILS)[keyof typeof VERIFIED_DETAILS][number];

const VERIFIED_DETAILS_SELECT = Object.fromEntries(
  Object.values(VERIFIED_DETAILS).flat().map((f) => [f, true]),
) as Record<VerifiedDetail, true>;

function staleVerifications(
  dto: Omit<UpdateCustomerDto, 'email'>,
  current: Record<VerifiedDetail, string | Date | null>,
) {
  const same = (a: string | null, b: string | Date | null) =>
    a === null ? b === null : b instanceof Date ? new Date(a).getTime() === b.getTime() : a === b;
  const cleared: Partial<Record<keyof typeof VERIFIED_DETAILS, null>> = {};
  for (const [verifiedAt, details] of Object.entries(VERIFIED_DETAILS) as [
    keyof typeof VERIFIED_DETAILS,
    readonly VerifiedDetail[],
  ][]) {
    if (dto[verifiedAt] !== undefined) continue;
    if (details.some((f) => dto[f] !== undefined && !same(dto[f] ?? null, current[f]))) cleared[verifiedAt] = null;
  }
  return cleared;
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return new ConflictException('This user already has a customer profile');
    if (e.code === 'P2003') return new BadRequestException('userId does not match an existing user');
  }
  return e;
}
