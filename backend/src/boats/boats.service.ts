import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBoatDto } from './dto/create-boat.dto.js';
import { UpdateBoatDto } from './dto/update-boat.dto.js';

@Injectable()
export class BoatsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { status?: string } = {}) {
    return this.prisma.boat.findMany({
      where: filters.status ? { status: filters.status } : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const boat = await this.prisma.boat.findUnique({ where: { id } });
    if (!boat) throw new NotFoundException(`Boat ${id} not found`);
    return boat;
  }

  create(dto: CreateBoatDto) {
    return this.prisma.boat.create({ data: toData(dto) as Prisma.BoatCreateInput });
  }

  async update(id: string, dto: UpdateBoatDto) {
    await this.findOne(id);
    return this.prisma.boat.update({ where: { id }, data: toData(dto) });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.boat.delete({ where: { id } });
  }
}

const DATE_FIELDS = ['insuranceExpiry', 'lastServiceDate', 'nextServiceDate'] as const;

function toData(dto: UpdateBoatDto): Prisma.BoatUpdateInput {
  const data: Prisma.BoatUpdateInput = { ...dto };
  for (const field of DATE_FIELDS) {
    if (dto[field] !== undefined) data[field] = new Date(dto[field]);
  }
  return data;
}
