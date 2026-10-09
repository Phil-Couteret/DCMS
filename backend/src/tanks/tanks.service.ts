import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { csvDate, csvRecords, type ImportResult, type UploadedFileData } from '../common/csv.js';
import { centerToday } from '../financial/center-day.js';
import { Prisma } from '../generated/prisma/client.js';
import { TankStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { CreateTankDto } from './dto/create-tank.dto.js';
import { UpdateTankDto } from './dto/update-tank.dto.js';
import { DEFAULT_SETTINGS } from '../config/tenant-defaults.js';
import { tankSize, tankTests, type TestIntervals } from './tank-rules.js';

type TankRow = Prisma.TankGetPayload<{ include: { location: { select: { id: true; name: true } } } }>;

@Injectable()
export class TanksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: TenantConfig,
  ) {}

  // Each tank with its next test dates and their state on the center's date.
  async findAll(filters: { locationId?: string; status?: TankStatus } = {}) {
    const [tanks, { today, intervals }] = await Promise.all([
      this.prisma.tank.findMany({
        where: {
          ...(filters.locationId && { locationId: filters.locationId }),
          ...(filters.status && { status: filters.status }),
        },
        include: { location: { select: { id: true, name: true } } },
        orderBy: [{ status: 'asc' }, { size: 'asc' }, { serialNumber: 'asc' }],
      }),
      this.schedule(),
    ]);
    return tanks.map((t) => withDue(t, intervals, today));
  }

  async findOne(id: string) {
    const tank = await this.prisma.tank.findUnique({ where: { id }, include: { location: { select: { id: true, name: true } } } });
    if (!tank) throw new NotFoundException(`Tank ${id} not found`);
    const { today, intervals } = await this.schedule();
    return withDue(tank, intervals, today);
  }

  async create(dto: CreateTankDto) {
    try {
      const { id } = await this.prisma.tank.create({ data: toData(dto) as Prisma.TankUncheckedCreateInput });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateTankDto) {
    await this.findOne(id);
    try {
      await this.prisma.tank.update({ where: { id }, data: toData(dto) });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tank.delete({ where: { id } });
  }

  // Adds the tanks in a CSV file. A row whose serial number is already on
  // record (or earlier in the file) is skipped; a row with a problem is
  // reported and the others are still imported. `locationId` is for rows
  // without a location column.
  async import(file: UploadedFileData | undefined, locationId?: string): Promise<ImportResult> {
    const { columns, records } = csvRecords(file);
    for (const [name, aliases] of Object.entries(REQUIRED)) {
      if (!aliases.some((a) => columns.has(a))) throw new BadRequestException(`The CSV file needs a ${name} column`);
    }
    const locations = await this.prisma.location.findMany({ select: { id: true, name: true } });
    if (locationId && !locations.some((l) => l.id === locationId)) {
      throw new BadRequestException('locationId does not match an existing location');
    }
    const known = new Set((await this.prisma.tank.findMany({ select: { serialNumber: true } })).map((t) => t.serialNumber.toLowerCase()));
    const result: ImportResult = { imported: 0, skipped: [], errors: [] };
    const rows: Prisma.TankCreateManyInput[] = [];

    for (const r of records) {
      const problems: string[] = [];
      const serialNumber = r.get(...COLUMNS.serialNumber);
      const sizeText = r.get(...COLUMNS.size);
      const size = sizeText ? tankSize(sizeText) : undefined;
      if (!serialNumber) problems.push('serial number is missing');
      if (!sizeText) problems.push('size is missing');
      else if (!size) problems.push(`size "${sizeText}" is not one of 10L, 12L, 15L, Nitrox12L, Nitrox15L`);
      const date = (aliases: string[], label: string) => {
        const text = r.get(...aliases);
        if (!text) return null;
        const iso = csvDate(text);
        if (!iso) problems.push(`${label} "${text}" is not a date (DD/MM/YYYY or YYYY-MM-DD)`);
        return iso ? new Date(iso) : null;
      };
      const visualInspectionDate = date(COLUMNS.visual, 'visual inspection date');
      const hydrostaticTestDate = date(COLUMNS.hydrostatic, 'hydrostatic test date');
      const statusText = r.get(...COLUMNS.status)?.toUpperCase();
      if (statusText && !(statusText in TankStatus)) problems.push(`status "${statusText}" is not ACTIVE or RETIRED`);
      const locationName = r.get(...COLUMNS.location);
      const location = locationName ? locations.find((l) => l.name.toLowerCase() === locationName.toLowerCase()) : undefined;
      if (locationName && !location) problems.push(`there is no location called "${locationName}"`);
      const notes = r.get(...COLUMNS.notes);
      if (notes && notes.length > 1000) problems.push('notes are over 1000 characters');

      if (problems.length > 0) {
        result.errors.push({ line: r.line, message: problems.join('; ') });
        continue;
      }
      if (known.has(serialNumber!.toLowerCase())) {
        result.skipped.push({ line: r.line, reason: `tank ${serialNumber} is already on record` });
        continue;
      }
      known.add(serialNumber!.toLowerCase());
      rows.push({
        serialNumber: serialNumber!,
        size: size!,
        visualInspectionDate,
        hydrostaticTestDate,
        status: (statusText as TankStatus | undefined) ?? TankStatus.ACTIVE,
        notes: notes ?? null,
        locationId: location?.id ?? locationId ?? null,
      });
    }
    // All the valid rows, or (on a clash with a tank added meanwhile) none.
    try {
      result.imported = (await this.prisma.tank.createMany({ data: rows })).count;
    } catch (e) {
      throw mapError(e);
    }
    return result;
  }

  // The center's date and its test intervals.
  private async schedule(): Promise<{ today: string; intervals: TestIntervals }> {
    const [timeZone, settings] = await Promise.all([
      this.config.timeZone(),
      this.prisma.centerSettings.findFirst({
        select: { visualInspectionIntervalMonths: true, hydrostaticTestIntervalMonths: true },
      }),
    ]);
    return {
      today: centerToday(timeZone),
      intervals: settings ?? {
        visualInspectionIntervalMonths: DEFAULT_SETTINGS.visualInspectionIntervalMonths,
        hydrostaticTestIntervalMonths: DEFAULT_SETTINGS.hydrostaticTestIntervalMonths,
      },
    };
  }
}

// Column names accepted (compared loosely; see headerKey), including the
// original system's tank import headings.
const COLUMNS = {
  serialNumber: ['serialNumber', 'serial', 'serialNo'],
  size: ['size', 'sizeLitres', 'sizeLiters', 'sizeL'],
  visual: ['visualInspectionDate', 'visualInspection', 'lastVisualTest', 'lastTestVisual', 'visual'],
  hydrostatic: ['hydrostaticTestDate', 'hydrostaticTest', 'lastHydrostaticTest', 'lastTestHydrostatic', 'hydrostatic'],
  status: ['status'],
  notes: ['notes', 'remarks'],
  location: ['location'],
};
const REQUIRED = {
  'serialNumber': ['serialnumber', 'serial', 'serialno'],
  'size': ['size', 'sizelitres', 'sizeliters', 'sizel'],
};

function withDue(tank: TankRow, intervals: TestIntervals, today: string) {
  const { visual, hydrostatic } = tankTests(tank, intervals, today);
  return {
    ...tank,
    nextVisualInspection: visual.due,
    visualState: visual.state,
    nextHydrostaticTest: hydrostatic.due,
    hydrostaticState: hydrostatic.state,
  };
}

const DATE_FIELDS = ['visualInspectionDate', 'hydrostaticTestDate'] as const;

function toData(dto: UpdateTankDto): Prisma.TankUncheckedUpdateInput {
  const data: Record<string, unknown> = { ...dto };
  for (const field of DATE_FIELDS) {
    const value = dto[field];
    if (value !== undefined) data[field] = value === null ? null : new Date(value);
  }
  return data as Prisma.TankUncheckedUpdateInput;
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return new ConflictException('A tank with this serial number already exists');
    if (e.code === 'P2003') return new BadRequestException('locationId does not match an existing location');
  }
  return e;
}
