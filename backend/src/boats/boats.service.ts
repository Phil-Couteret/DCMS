import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { assertLocation } from '../locations/assert-location.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBoatDto } from './dto/create-boat.dto.js';
import { UpdateBoatDto } from './dto/update-boat.dto.js';

// Each boat comes with its location's name.
const LOCATION = { location: { select: { id: true, name: true } } } as const;

@Injectable()
export class BoatsService {
  constructor(private readonly prisma: PrismaService) {}

  // locationId "none": boats not assigned to a location.
  findAll(filters: { status?: string; locationId?: string } = {}) {
    return this.prisma.boat.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.locationId && { locationId: filters.locationId === 'none' ? null : filters.locationId }),
      },
      include: LOCATION,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const boat = await this.prisma.boat.findUnique({ where: { id }, include: LOCATION });
    if (!boat) throw new NotFoundException(`Boat ${id} not found`);
    return boat;
  }

  async create(dto: CreateBoatDto) {
    await assertLocation(this.prisma, dto.locationId);
    return this.prisma.boat.create({ data: toData(dto) as Prisma.BoatCreateInput, include: LOCATION });
  }

  async update(id: string, dto: UpdateBoatDto) {
    await this.findOne(id);
    await assertLocation(this.prisma, dto.locationId);
    return this.prisma.boat.update({ where: { id }, data: toData(dto), include: LOCATION });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.boat.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('This boat has bookings and cannot be deleted');
      }
      throw e;
    }
  }
}

const DATE_FIELDS = ['insuranceExpiry', 'lastServiceDate', 'nextServiceDate'] as const;

function toData(dto: UpdateBoatDto): Prisma.BoatUpdateInput {
  const data: Prisma.BoatUpdateInput = { ...dto };
  for (const field of DATE_FIELDS) {
    // null clears the date.
    if (dto[field] !== undefined) data[field] = dto[field] === null ? null : new Date(dto[field]);
  }
  return data;
}
