import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { csvDate, csvRecords, type ImportResult, type UploadedFileData } from '../common/csv.js';
import { Prisma } from '../generated/prisma/client.js';
import { EquipmentCondition, EquipmentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';

// CSV import columns, each with the header names it is known by (compared
// loosely: "Serial Number" = "serial_number" = "serialNumber").
const COLUMNS = {
  type: ['type'],
  brand: ['brand', 'make'],
  model: ['model'],
  size: ['size'],
  serialNumber: ['serialNumber', 'serial', 'serialNo'],
  purchaseDate: ['purchaseDate', 'purchased', 'bought'],
  purchaseCost: ['purchaseCost', 'cost', 'price'],
  condition: ['condition'],
};
const REQUIRED = ['type', 'brand', 'purchaseDate', 'purchaseCost'] as const;
const TEXT_MAX = 100;

// "120", "120.50", "120,50" or "€ 1 200,50" → 1200.5; undefined when not an
// amount of at most two decimals.
function csvAmount(value: string) {
  const text = value.replace(/[€\s]/g, '');
  const normal = /^\d{1,8}([.,]\d{1,2})?$/.test(text) ? text.replace(',', '.') : undefined;
  return normal === undefined ? undefined : Number(normal);
}

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  // Rental equipment from a CSV file: one item per row. Rows whose serial
  // number is already on record are skipped; rows with a problem are listed
  // with it. Every valid row is imported, or (on a clash) none.
  async import(file: UploadedFileData | undefined): Promise<ImportResult> {
    const { columns, records } = csvRecords(file);
    for (const name of REQUIRED) {
      if (!COLUMNS[name].some((a) => columns.has(a.toLowerCase()))) throw new BadRequestException(`The CSV file needs a ${name} column`);
    }
    const known = new Set(
      (await this.prisma.equipment.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true } })).map((e) =>
        e.serialNumber!.toLowerCase(),
      ),
    );
    const result: ImportResult = { imported: 0, skipped: [], errors: [] };
    const rows: Prisma.EquipmentCreateManyInput[] = [];
    for (const r of records) {
      const problems: string[] = [];
      const text = (name: keyof typeof COLUMNS, label: string) => {
        const value = r.get(...COLUMNS[name]);
        if (value && value.length > TEXT_MAX) problems.push(`${label} is over ${TEXT_MAX} characters`);
        return value;
      };
      const type = text('type', 'type')?.toLowerCase();
      const brand = text('brand', 'brand');
      const model = text('model', 'model');
      const size = text('size', 'size');
      const serialNumber = text('serialNumber', 'serial number');
      if (!type) problems.push('type is missing');
      if (!brand) problems.push('brand is missing');
      const dateText = r.get(...COLUMNS.purchaseDate);
      const purchaseDate = dateText ? csvDate(dateText) : undefined;
      if (!dateText) problems.push('purchase date is missing');
      else if (!purchaseDate) problems.push(`purchase date "${dateText}" is not a date (DD/MM/YYYY or YYYY-MM-DD)`);
      const costText = r.get(...COLUMNS.purchaseCost);
      const purchaseCost = costText ? csvAmount(costText) : undefined;
      if (!costText) problems.push('purchase cost is missing');
      else if (purchaseCost === undefined) problems.push(`purchase cost "${costText}" is not an amount such as 120 or 120.50`);
      const conditionText = r.get(...COLUMNS.condition)?.toUpperCase();
      if (conditionText && !(conditionText in EquipmentCondition)) {
        problems.push(`condition "${conditionText}" is not EXCELLENT, GOOD, FAIR or POOR`);
      }
      if (problems.length > 0) {
        result.errors.push({ line: r.line, message: problems.join('; ') });
        continue;
      }
      if (serialNumber && known.has(serialNumber.toLowerCase())) {
        result.skipped.push({ line: r.line, reason: `serial number ${serialNumber} is already on record` });
        continue;
      }
      if (serialNumber) known.add(serialNumber.toLowerCase());
      rows.push({
        type: type!,
        brand: brand!,
        model: model ?? null,
        size: size ?? null,
        serialNumber: serialNumber ?? null,
        purchaseDate: new Date(purchaseDate!),
        purchaseCost: purchaseCost!,
        ...(conditionText && { condition: conditionText as EquipmentCondition }),
      });
    }
    try {
      result.imported = (await this.prisma.equipment.createMany({ data: rows })).count;
    } catch (e) {
      throw mapError(e);
    }
    return result;
  }

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
