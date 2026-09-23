import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { BookingSource, BookingStatus, Role, TimeSlot } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { GuestBookingDto } from './dto/guest-booking.dto.js';
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

  // Public booking without an account. Finds or creates the user and customer
  // by email, then books the first active boat with room in that slot.
  async createGuest(dto: GuestBookingDto) {
    const date = startOfUtcDay(dto.date);
    const email = dto.email.toLowerCase();
    const booking = await this.prisma.$transaction(async (tx) => {
      const user =
        (await tx.user.findUnique({ where: { email }, select: { id: true } })) ??
        // randomUUID is not a bcrypt hash, so no password can ever match it:
        // the account exists for the booking and cannot be signed in to.
        (await tx.user.create({
          data: { email, passwordHash: randomUUID(), role: Role.CUSTOMER },
          select: { id: true },
        }));

      // An existing customer's details are left untouched: this route is
      // public, and anyone who knows an email address must not be able to
      // rewrite that customer's name or phone.
      const customer =
        (await tx.customer.findUnique({ where: { userId: user.id }, select: { id: true } })) ??
        (await tx.customer.create({
          data: {
            userId: user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            country: dto.country,
            language: dto.language,
          },
          select: { id: true },
        }));

      const boatId = await firstBoatWithRoom(tx, {
        date,
        timeSlot: dto.timeSlot,
        participantCount: dto.participantCount,
      });

      return tx.booking.create({
        data: {
          customerId: customer.id,
          boatId,
          siteId: null,
          activityType: dto.activityType,
          date,
          timeSlot: dto.timeSlot,
          participantCount: dto.participantCount,
          status: BookingStatus.PENDING,
          bookingSource: BookingSource.DIRECT,
          notes: JSON.stringify({
            certificationLevel: dto.certificationLevel ?? null,
            selectedEquipment: dto.selectedEquipment ?? [],
            totalPrice: dto.totalPrice ?? null,
          }),
        },
        select: { id: true },
      });
    });
    // No invoice exists yet, so the booking id doubles as the reference.
    return { bookingId: booking.id, reference: booking.id };
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

async function seatsBooked(tx: Tx, slot: Omit<Slot, 'participantCount'>, excludeBookingId?: string) {
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
  return taken._sum.participantCount ?? 0;
}

async function assertSeats(tx: Tx, slot: Slot, excludeBookingId?: string) {
  const capacity = await lockBoat(tx, slot.boatId);
  const booked = await seatsBooked(tx, slot, excludeBookingId);
  if (booked + slot.participantCount > capacity) {
    throw new ConflictException(
      `Boat capacity exceeded: ${booked} of ${capacity} seats already booked, ` +
        `${slot.participantCount} requested`,
    );
  }
}

// Tries active boats in a fixed order (by id, so concurrent requests lock them
// in the same order and cannot deadlock) and returns the first with room.
// Each boat is locked before its seats are counted, as in assertSeats.
async function firstBoatWithRoom(tx: Tx, slot: Omit<Slot, 'boatId'>) {
  const boats = await tx.boat.findMany({
    where: { status: 'active' },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  for (const { id } of boats) {
    const capacity = await lockBoat(tx, id);
    const booked = await seatsBooked(tx, { ...slot, boatId: id });
    if (booked + slot.participantCount <= capacity) return id;
  }
  throw new ConflictException('No available boats for this slot');
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
