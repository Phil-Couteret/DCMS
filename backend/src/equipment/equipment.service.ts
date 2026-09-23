import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { EquipmentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { type?: string; size?: string; status?: EquipmentStatus } = {}) {
    return this.prisma.equipment.findMany({
      where: {
        ...(filters.type && { type: filters.type }),
        ...(filters.size && { size: filters.size }),
        ...(filters.status && { status: filters.status }),
      },
      orderBy: [{ type: 'asc' }, { brand: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.equipment.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Equipment ${id} not found`);
    return item;
  }

  async create(dto: CreateEquipmentDto) {
    try {
      return await this.prisma.equipment.create({
        data: toData(dto) as Prisma.EquipmentCreateInput,
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    await this.findOne(id);
    try {
      return await this.prisma.equipment.update({ where: { id }, data: toData(dto) });
    } catch (e) {
      throw mapError(e);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.equipment.delete({ where: { id } });
  }
}

const DATE_FIELDS = ['purchaseDate', 'lastMaintenance', 'nextMaintenance'] as const;

function toData(dto: UpdateEquipmentDto): Prisma.EquipmentUpdateInput {
  const data: Prisma.EquipmentUpdateInput = { ...dto };
  for (const field of DATE_FIELDS) {
    if (dto[field] !== undefined) data[field] = new Date(dto[field]);
  }
  return data;
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('An item with this serial number already exists');
  }
  return e;
}
