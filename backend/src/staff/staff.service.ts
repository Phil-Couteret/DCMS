import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { StaffStatus, StaffType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { CreateQualificationDto, UpdateQualificationDto } from './dto/create-qualification.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { SetAvailabilityDto } from './dto/set-availability.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';

// Every column except phone, which is only returned to authenticated callers.
const PUBLIC_FIELDS = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  type: true,
  status: true,
  hireDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StaffSelect;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  findAll(filters: { type?: StaffType; status?: StaffStatus } = {}, includePhone = false) {
    return this.prisma.staff.findMany({
      where: {
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
      },
      select: { ...PUBLIC_FIELDS, phone: includePhone },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string, includePhone = false) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: {
        ...PUBLIC_FIELDS,
        phone: includePhone,
        qualifications: { orderBy: { issueDate: 'desc' } },
        availability: { orderBy: { date: 'asc' } },
      },
    });
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return staff;
  }

  // The staff profile of one of this tenant's accounts (an active
  // membership: add the account in Settings → Users first). A profile never
  // grants an account access: otherwise any account on the platform could be
  // pulled into a tenant by its id.
  async create(dto: CreateStaffDto) {
    const tenantId = this.tenant.tenantId;
    const member = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId: dto.userId, tenantId } },
      select: { isActive: true },
    });
    if (!member?.isActive) {
      throw new BadRequestException('Choose an account of this center (Settings → Users) for the staff profile');
    }
    try {
      return await this.prisma.staff.create({ data: { ...dto, hireDate: new Date(dto.hireDate) } });
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.assertExists(id);
    const { hireDate, ...rest } = dto;
    try {
      return await this.prisma.staff.update({
        where: { id },
        data: { ...rest, ...(hireDate !== undefined && { hireDate: new Date(hireDate) }) },
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.staff.delete({ where: { id } });
  }

  async addQualification(staffId: string, dto: CreateQualificationDto) {
    await this.assertExists(staffId);
    const issueDate = new Date(dto.issueDate);
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : undefined;
    if (expiryDate && expiryDate < issueDate) {
      throw new BadRequestException('expiryDate must not be before issueDate');
    }
    return this.prisma.staffQualification.create({
      data: { ...dto, staffId, issueDate, expiryDate },
    });
  }

  async updateQualification(staffId: string, qualificationId: string, dto: UpdateQualificationDto) {
    const current = await this.findQualification(staffId, qualificationId);
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : current.issueDate;
    const expiryDate =
      dto.expiryDate === null ? null : dto.expiryDate ? new Date(dto.expiryDate) : current.expiryDate;
    if (expiryDate && expiryDate < issueDate) {
      throw new BadRequestException('expiryDate must not be before issueDate');
    }
    return this.prisma.staffQualification.update({
      where: { id: qualificationId },
      data: { ...dto, issueDate, expiryDate },
    });
  }

  async removeQualification(staffId: string, qualificationId: string) {
    await this.findQualification(staffId, qualificationId);
    return this.prisma.staffQualification.delete({ where: { id: qualificationId } });
  }

  private async findQualification(staffId: string, qualificationId: string) {
    const q = await this.prisma.staffQualification.findFirst({ where: { id: qualificationId, staffId } });
    if (!q) throw new NotFoundException(`Qualification ${qualificationId} not found`);
    return q;
  }

  async setAvailability(staffId: string, dto: SetAvailabilityDto) {
    await this.assertExists(staffId);
    const date = startOfUtcDay(dto.date);
    const fields = { available: dto.available ?? true, reason: dto.reason ?? null };
    return this.prisma.staffAvailability.upsert({
      where: { staffId_date: { staffId, date } },
      create: { staffId, date, ...fields },
      update: fields,
    });
  }

  private async assertExists(id: string) {
    const found = await this.prisma.staff.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException(`Staff ${id} not found`);
  }
}

function startOfUtcDay(value: string) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return new ConflictException('This user already has a staff profile');
    if (e.code === 'P2003') return new BadRequestException('userId does not match an existing user');
  }
  return e;
}
