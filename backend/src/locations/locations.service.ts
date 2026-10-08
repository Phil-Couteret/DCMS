import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveLocationDto } from './dto/location.dto.js';

const SELECT = {
  id: true,
  name: true,
  type: true,
  address: true,
  contactInfo: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { boats: true, diveSites: true } },
} satisfies Prisma.LocationSelect;

type Row = Prisma.LocationGetPayload<{ select: typeof SELECT }>;

function toView({ _count, ...location }: Row) {
  return { ...location, boatCount: _count.boats, diveSiteCount: _count.diveSites };
}

// Empty strings are dropped, and an object with nothing left is null.
function compact(value: Record<string, string | undefined> | undefined) {
  const entries = Object.entries(value ?? {})
    .map(([k, v]) => [k, v?.trim()] as const)
    .filter(([, v]) => v);
  return entries.length > 0 ? (Object.fromEntries(entries) as Prisma.InputJsonObject) : Prisma.DbNull;
}

function toData(dto: SaveLocationDto) {
  return {
    name: dto.name.trim(),
    type: dto.type,
    address: compact(dto.address as Record<string, string | undefined>),
    contactInfo: compact(dto.contactInfo as Record<string, string | undefined>),
    isActive: dto.isActive ?? true,
  };
}

// The tenant's locations, with how many boats and dive sites each has.
@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { active?: boolean } = {}) {
    const rows = await this.prisma.location.findMany({
      where: filters.active === undefined ? {} : { isActive: filters.active },
      select: SELECT,
      orderBy: { name: 'asc' },
    });
    return rows.map(toView);
  }

  async findOne(id: string) {
    const row = await this.prisma.location.findUnique({ where: { id }, select: SELECT });
    if (!row) throw new NotFoundException(`Location ${id} not found`);
    return toView(row);
  }

  async create(dto: SaveLocationDto) {
    const row = await this.prisma.location.create({ data: toData(dto), select: SELECT });
    return toView(row);
  }

  async update(id: string, dto: SaveLocationDto) {
    await this.findOne(id);
    const row = await this.prisma.location.update({ where: { id }, data: toData(dto), select: SELECT });
    return toView(row);
  }

  // Its boats, dive sites and bookings stay, unassigned (onDelete SetNull).
  async remove(id: string) {
    const location = await this.findOne(id);
    await this.prisma.location.delete({ where: { id } });
    return location;
  }
}
