import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { StaffStatus, StaffType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateQualificationDto } from './dto/create-qualification.dto.js';
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
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateStaffDto) {
    try {
      return await this.prisma.staff.create({
        data: { ...dto, hireDate: new Date(dto.hireDate) },
      });
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
