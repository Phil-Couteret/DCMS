import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { EquipmentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto.js';
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

  async maintenanceLogs(equipmentId: string) {
    await this.findOne(equipmentId);
    return this.prisma.maintenanceLog.findMany({
      where: { equipmentId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // Records maintenance. When the entry is the newest on record it also sets
  // lastMaintenance to its date and clears nextMaintenance, which staff then
  // schedule again. A backdated entry leaves both dates alone, so logging an
  // old repair cannot rewind lastMaintenance or wipe a schedule set since.
  async addMaintenance(equipmentId: string, dto: CreateMaintenanceLogDto) {
    const date = startOfUtcDay(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.equipment.findUnique({
        where: { id: equipmentId },
        select: { lastMaintenance: true },
      });
      if (!item) throw new NotFoundException(`Equipment ${equipmentId} not found`);
      const log = await tx.maintenanceLog.create({ data: { ...dto, date, equipmentId } });
      if (!item.lastMaintenance || date >= item.lastMaintenance) {
        await tx.equipment.update({
          where: { id: equipmentId },
          data: { lastMaintenance: date, nextMaintenance: null },
        });
      }
      return log;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.equipment.delete({ where: { id } });
  }
}

const NULLABLE_DATE_FIELDS = ['lastMaintenance', 'nextMaintenance'] as const;

function toData(dto: UpdateEquipmentDto): Prisma.EquipmentUpdateInput {
  const data: Prisma.EquipmentUpdateInput = { ...dto };
  const purchaseDate = dto.purchaseDate as string | null | undefined;
  if (purchaseDate === null) throw new BadRequestException('purchaseDate cannot be cleared');
  if (purchaseDate !== undefined) data.purchaseDate = new Date(purchaseDate);
  for (const field of NULLABLE_DATE_FIELDS) {
    const value = dto[field] as string | null | undefined;
    // null clears the date; new Date(null) would store 1 January 1970.
    if (value !== undefined) data[field] = value === null ? null : new Date(value);
  }
  return data;
}

function startOfUtcDay(value: string) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('An item with this serial number already exists');
  }
  return e;
}
