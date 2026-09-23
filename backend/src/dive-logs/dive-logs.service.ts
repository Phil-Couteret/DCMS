import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddParticipantDto } from './dto/add-participant.dto.js';
import { AddSignatureDto } from './dto/add-signature.dto.js';
import { CreateDiveLogDto } from './dto/create-dive-log.dto.js';
import { ReportIncidentDto } from './dto/report-incident.dto.js';
import { UpdateDiveLogDto } from './dto/update-dive-log.dto.js';

type Tx = Prisma.TransactionClient;

const LIST_INCLUDE = {
  site: { select: { id: true, nameEn: true } },
  guide: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { participants: true, signatures: true } },
} satisfies Prisma.DiveLogInclude;

const DETAIL_INCLUDE = {
  booking: { select: { id: true, activityType: true, timeSlot: true, status: true } },
  site: { select: { id: true, nameEn: true } },
  guide: { select: { id: true, firstName: true, lastName: true } },
  participants: {
    include: { customer: { select: { id: true, firstName: true, lastName: true } } },
  },
  signatures: { orderBy: { signedAt: 'asc' } },
  incident: true,
} satisfies Prisma.DiveLogInclude;

@Injectable()
export class DiveLogsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { date?: string; siteId?: string; guideId?: string } = {}) {
    return this.prisma.diveLog.findMany({
      where: {
        ...(filters.date && { date: startOfUtcDay(filters.date) }),
        ...(filters.siteId && { siteId: filters.siteId }),
        ...(filters.guideId && { guideId: filters.guideId }),
      },
      include: LIST_INCLUDE,
      orderBy: [{ date: 'desc' }, { entryTime: 'desc' }],
    });
  }

  async findOne(id: string) {
    const log = await this.prisma.diveLog.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!log) throw new NotFoundException(`Dive log ${id} not found`);
    return log;
  }

  async create(dto: CreateDiveLogDto) {
    const date = startOfUtcDay(dto.date);
    const entryTime = new Date(dto.entryTime);
    const exitTime = new Date(dto.exitTime);
    assertTimes(entryTime, exitTime, dto.duration);
    try {
      const { id } = await this.prisma.$transaction(async (tx) => {
        await assertReferences(tx, dto);
        const logNumber = await nextLogNumber(tx, date.getUTCFullYear());
        return tx.diveLog.create({
          data: { ...dto, logNumber, date, entryTime, exitTime },
          select: { id: true },
        });
      });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateDiveLogDto) {
    const current = await this.findOne(id);
    const entryTime = dto.entryTime !== undefined ? new Date(dto.entryTime) : current.entryTime;
    const exitTime = dto.exitTime !== undefined ? new Date(dto.exitTime) : current.exitTime;
    assertTimes(entryTime, exitTime, dto.duration ?? current.duration);
    try {
      await assertReferences(this.prisma, dto);
      await this.prisma.diveLog.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.date !== undefined && { date: startOfUtcDay(dto.date) }),
          entryTime,
          exitTime,
        },
      });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async addParticipant(diveLogId: string, dto: AddParticipantDto) {
    await this.assertExists(diveLogId);
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('customerId does not match an existing customer');
    try {
      return await this.prisma.diveLogParticipant.create({ data: { ...dto, diveLogId } });
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException('This customer is already a participant on this dive log');
      }
      throw e;
    }
  }

  async addSignature(diveLogId: string, dto: AddSignatureDto) {
    await this.assertExists(diveLogId);
    return this.prisma.diveLogSignature.create({ data: { ...dto, diveLogId } });
  }

  async reportIncident(diveLogId: string, dto: ReportIncidentDto) {
    await this.assertExists(diveLogId);
    try {
      return await this.prisma.incident.create({ data: { ...dto, diveLogId } });
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException('An incident has already been reported for this dive log');
      }
      throw e;
    }
  }

  private async assertExists(id: string) {
    const found = await this.prisma.diveLog.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException(`Dive log ${id} not found`);
  }
}

// Numbers run YYYY-001, YYYY-002 ... per year of the dive date, growing past
// three digits when needed. The per-year advisory lock serialises concurrent
// creates so two logs cannot be given the same number.
async function nextLogNumber(tx: Tx, year: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('dive_log_number'), ${year}::int)`;
  const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(split_part("logNumber", '-', 2) AS int)) AS max
    FROM "DiveLog" WHERE "logNumber" LIKE ${`${year}-%`}`;
  return `${year}-${String((max ?? 0) + 1).padStart(3, '0')}`;
}

function assertTimes(entryTime: Date, exitTime: Date, duration: number) {
  if (exitTime <= entryTime) {
    throw new BadRequestException('exitTime must be after entryTime');
  }
  const minutes = Math.round((exitTime.getTime() - entryTime.getTime()) / 60_000);
  if (minutes !== duration) {
    throw new BadRequestException(
      `duration must equal exitTime minus entryTime: expected ${minutes}, got ${duration}`,
    );
  }
}

async function assertReferences(
  db: Tx,
  refs: { bookingId?: string; siteId?: string; guideId?: string | null },
) {
  if (refs.bookingId) {
    const found = await db.booking.findUnique({ where: { id: refs.bookingId }, select: { id: true } });
    if (!found) throw new BadRequestException('bookingId does not match an existing booking');
  }
  if (refs.siteId) {
    const found = await db.diveSite.findUnique({ where: { id: refs.siteId }, select: { id: true } });
    if (!found) throw new BadRequestException('siteId does not match an existing dive site');
  }
  if (refs.guideId) {
    const found = await db.staff.findUnique({ where: { id: refs.guideId }, select: { id: true } });
    if (!found) throw new BadRequestException('guideId does not match an existing staff member');
  }
}

function startOfUtcDay(value: string) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

function mapError(e: unknown) {
  if (isUniqueViolation(e)) {
    return new ConflictException('This booking already has a dive log');
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
    return new BadRequestException('A referenced record does not exist');
  }
  return e;
}
