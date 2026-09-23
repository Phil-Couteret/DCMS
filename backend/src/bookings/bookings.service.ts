import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BookingStatus, TimeSlot } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';

// Statuses that hold seats on the boat. CANCELLED and NO_SHOW free theirs.
const SEAT_HOLDING: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

const INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  boat: { select: { id: true, name: true, capacity: true } },
  site: { select: { id: true, nameEn: true } },
} satisfies Prisma.BookingInclude;

type Tx = Prisma.TransactionClient;

interface Slot {
  boatId: string;
  date: Date;
  timeSlot: TimeSlot;
  participantCount: number;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    filters: { status?: BookingStatus; date?: string; boatId?: string; customerId?: string } = {},
  ) {
    return this.prisma.booking.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.date && { date: startOfUtcDay(filters.date) }),
        ...(filters.boatId && { boatId: filters.boatId }),
        ...(filters.customerId && { customerId: filters.customerId }),
      },
      include: INCLUDE,
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: INCLUDE });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async create(dto: CreateBookingDto) {
    const date = startOfUtcDay(dto.date);
    const status = dto.status ?? BookingStatus.PENDING;
    try {
      return await this.prisma.$transaction(async (tx) => {
        await assertReferences(tx, dto);
        if (SEAT_HOLDING.includes(status)) {
          await assertSeats(tx, { ...dto, date });
        } else {
          await lockBoat(tx, dto.boatId);
        }
        return tx.booking.create({ data: { ...dto, date, status }, include: INCLUDE });
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateBookingDto) {
    const current = await this.findOne(id);
    const date = dto.date !== undefined ? startOfUtcDay(dto.date) : undefined;
    const next = {
      boatId: dto.boatId ?? current.boatId,
      date: date ?? current.date,
      timeSlot: dto.timeSlot ?? current.timeSlot,
      participantCount: dto.participantCount ?? current.participantCount,
      status: dto.status ?? current.status,
    };
    try {
      return await this.prisma.$transaction(async (tx) => {
        await assertReferences(tx, dto);
        if (SEAT_HOLDING.includes(next.status)) {
          await assertSeats(tx, next, id);
        }
        return tx.booking.update({
          where: { id },
          data: { ...dto, ...(date && { date }) },
          include: INCLUDE,
        });
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: INCLUDE,
    });
  }
}

// The boat is checked by lockBoat; customer and site are checked here so the
// error names the field instead of surfacing a foreign-key failure.
async function assertReferences(tx: Tx, refs: { customerId?: string; siteId?: string | null }) {
  if (refs.customerId) {
    const found = await tx.customer.findUnique({ where: { id: refs.customerId }, select: { id: true } });
    if (!found) throw new BadRequestException('customerId does not match an existing customer');
  }
  if (refs.siteId) {
    const found = await tx.diveSite.findUnique({ where: { id: refs.siteId }, select: { id: true } });
    if (!found) throw new BadRequestException('siteId does not match an existing dive site');
  }
}

// Locks the boat row so concurrent bookings for it are checked one after the
// other rather than both passing the capacity check and overbooking.
async function lockBoat(tx: Tx, boatId: string) {
  const rows = await tx.$queryRaw<{ capacity: number }[]>`
    SELECT capacity FROM "Boat" WHERE id = ${boatId} FOR UPDATE`;
  if (rows.length === 0) throw new BadRequestException('boatId does not match an existing boat');
  return rows[0].capacity;
}

async function assertSeats(tx: Tx, slot: Slot, excludeBookingId?: string) {
  const capacity = await lockBoat(tx, slot.boatId);
  const taken = await tx.booking.aggregate({
    _sum: { participantCount: true },
    where: {
      boatId: slot.boatId,
      date: slot.date,
      timeSlot: slot.timeSlot,
      status: { in: SEAT_HOLDING },
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
    },
  });
  const booked = taken._sum.participantCount ?? 0;
  if (booked + slot.participantCount > capacity) {
    throw new ConflictException(
      `Boat capacity exceeded: ${booked} of ${capacity} seats already booked, ` +
        `${slot.participantCount} requested`,
    );
  }
}

function startOfUtcDay(value: string) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Backstop for a reference deleted between the check and the write.
function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
    return new BadRequestException('A referenced record does not exist');
  }
  return e;
}
