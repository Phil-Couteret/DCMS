import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  BookingStatus,
  StaffStatus,
  TimeSlot,
  TripStaffRole,
  TripStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignStaffDto } from './dto/assign-staff.dto.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';

// Statuses that hold a place on the trip. CANCELLED and NO_SHOW free theirs.
const SEAT_HOLDING: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

// Trips that can no longer take staff or bookings.
const CLOSED: TripStatus[] = [TripStatus.COMPLETED, TripStatus.CANCELLED];

const STAFF_INCLUDE = {
  include: { staff: { select: { id: true, firstName: true, lastName: true, type: true } } },
  orderBy: { role: 'asc' },
} satisfies Prisma.Trip$staffArgs;

const LIST_INCLUDE = {
  boat: { select: { id: true, name: true } },
  plannedSite: { select: { id: true, nameEn: true } },
  actualSite: { select: { id: true, nameEn: true } },
  staff: STAFF_INCLUDE,
  _count: { select: { bookings: { where: { status: { in: SEAT_HOLDING } } } } },
} satisfies Prisma.TripInclude;

const DETAIL_INCLUDE = {
  boat: { select: { id: true, name: true, capacity: true } },
  plannedSite: { select: { id: true, nameEn: true } },
  actualSite: { select: { id: true, nameEn: true } },
  staff: STAFF_INCLUDE,
  bookings: {
    include: { customer: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.TripInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(range: { from?: string; to?: string } = {}) {
    const from = range.from !== undefined ? startOfUtcDay(range.from) : undefined;
    const to = range.to !== undefined ? startOfUtcDay(range.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('from must not be after to');
    }
    return this.prisma.trip.findMany({
      where: { date: { ...(from && { gte: from }), ...(to && { lte: to }) } },
      include: LIST_INCLUDE,
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    return trip;
  }

  async create(dto: CreateTripDto) {
    const date = startOfUtcDay(dto.date);
    const boatId = dto.boatId ?? null;
    try {
      const { id } = await this.prisma.$transaction(async (tx) => {
        await assertReferences(tx, { boatId, siteIds: [dto.plannedSiteId] });
        // The unique index lets two shore trips (boatId null) share a slot, so
        // creates for the same slot are serialised and checked here instead.
        await lockSlot(tx, date, dto.timeSlot, boatId);
        const existing = await tx.trip.findFirst({
          where: { date, timeSlot: dto.timeSlot, boatId },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException(
            `A trip already exists for this date, time slot and ${boatId ? 'boat' : 'shore dive'}`,
          );
        }
        return tx.trip.create({ data: { ...dto, boatId, date }, select: { id: true } });
      });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateTripDto) {
    await this.findOne(id);
    try {
      await this.prisma.$transaction(async (tx) => {
        await assertReferences(tx, { siteIds: [dto.plannedSiteId, dto.actualSiteId] });
        await tx.trip.update({ where: { id }, data: dto });
      });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  // Linked bookings are kept and unlinked (tripId is set to null); staff
  // assignments are deleted with the trip.
  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const trip = await lockTrip(tx, id);
      if (trip.status !== TripStatus.PLANNED) {
        throw new ConflictException(`Only PLANNED trips can be deleted; this one is ${trip.status}`);
      }
      const confirmed = await tx.booking.count({
        where: { tripId: id, status: BookingStatus.CONFIRMED },
      });
      if (confirmed > 0) {
        throw new ConflictException(
          `Trip has ${confirmed} confirmed booking(s); move or cancel them first`,
        );
      }
      await tx.trip.delete({ where: { id } });
    });
    return { id, deleted: true };
  }

  async assignStaff(id: string, dto: AssignStaffDto) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const trip = await lockTrip(tx, id);
        assertOpen(trip);

        const staff = await tx.staff.findUnique({
          where: { id: dto.staffId },
          select: { status: true },
        });
        if (!staff) throw new BadRequestException('staffId does not match an existing staff member');
        if (staff.status !== StaffStatus.ACTIVE) {
          throw new BadRequestException('Staff member is not active');
        }

        if (dto.role === TripStaffRole.CAPTAIN) {
          const captain = await tx.tripStaff.findFirst({
            where: { tripId: id, role: TripStaffRole.CAPTAIN, staffId: { not: dto.staffId } },
            select: { id: true },
          });
          if (captain) throw new ConflictException('Trip already has a captain');
        }

        // One person cannot be on two outings at the same time.
        const clash = await tx.tripStaff.findFirst({
          where: {
            staffId: dto.staffId,
            tripId: { not: id },
            trip: { date: trip.date, timeSlot: trip.timeSlot, status: { not: TripStatus.CANCELLED } },
          },
          select: { tripId: true },
        });
        if (clash) {
          throw new ConflictException(
            `Staff member is already assigned to trip ${clash.tripId} in this time slot`,
          );
        }

        await tx.tripStaff.create({ data: { tripId: id, staffId: dto.staffId, role: dto.role } });
      });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async removeStaff(id: string, staffId: string) {
    await this.findOne(id);
    const { count } = await this.prisma.tripStaff.deleteMany({ where: { tripId: id, staffId } });
    if (count === 0) throw new NotFoundException(`Staff member ${staffId} is not on trip ${id}`);
    return this.findOne(id);
  }

  // Moves the booking here if it is on another trip. The booking must be for
  // the trip's date and time slot, and on its boat when the trip has one.
  async linkBooking(id: string, bookingId: string) {
    await this.prisma.$transaction(async (tx) => {
      const trip = await lockTrip(tx, id);
      assertOpen(trip);

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          tripId: true,
          boatId: true,
          date: true,
          timeSlot: true,
          status: true,
          participantCount: true,
        },
      });
      if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
      if (booking.tripId === id) return;
      if (!SEAT_HOLDING.includes(booking.status)) {
        throw new BadRequestException(`A ${booking.status} booking cannot be added to a trip`);
      }
      if (booking.date.getTime() !== trip.date.getTime() || booking.timeSlot !== trip.timeSlot) {
        throw new BadRequestException("Booking date and time slot do not match the trip's");
      }
      if (trip.boatId && booking.boatId !== trip.boatId) {
        throw new BadRequestException("Booking is on a different boat from the trip's");
      }

      const taken = await tx.booking.aggregate({
        _sum: { participantCount: true },
        where: { tripId: id, status: { in: SEAT_HOLDING } },
      });
      const booked = taken._sum.participantCount ?? 0;
      if (booked + booking.participantCount > trip.maxDivers) {
        throw new ConflictException(
          `Trip is full: ${booked} of ${trip.maxDivers} places taken, ` +
            `${booking.participantCount} requested`,
        );
      }

      await tx.booking.update({ where: { id: bookingId }, data: { tripId: id } });
    });
    return this.findOne(id);
  }
}

// Locks the trip row so concurrent staff, booking and delete requests for the
// same trip run one after the other and see each other's changes.
async function lockTrip(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<
    {
      id: string;
      date: Date;
      timeSlot: TimeSlot;
      boatId: string | null;
      status: TripStatus;
      maxDivers: number;
    }[]
  >`SELECT id, date, "timeSlot", "boatId", status, "maxDivers"
    FROM "Trip" WHERE id = ${id} FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException(`Trip ${id} not found`);
  return rows[0];
}

// Transaction-scoped lock on one date + time slot + boat (or shore), held
// until commit, so two creates for the same slot cannot both pass the check.
async function lockSlot(tx: Tx, date: Date, timeSlot: TimeSlot, boatId: string | null) {
  const key = `trip:${date.toISOString()}:${timeSlot}:${boatId ?? 'shore'}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

function assertOpen(trip: { status: TripStatus }) {
  if (CLOSED.includes(trip.status)) {
    throw new ConflictException(`Trip is ${trip.status}`);
  }
}

// Checked here so the error names the field instead of surfacing a
// foreign-key failure.
async function assertReferences(
  tx: Tx,
  refs: { boatId?: string | null; siteIds: (string | null | undefined)[] },
) {
  if (refs.boatId) {
    const found = await tx.boat.findUnique({ where: { id: refs.boatId }, select: { id: true } });
    if (!found) throw new BadRequestException('boatId does not match an existing boat');
  }
  for (const siteId of refs.siteIds) {
    if (!siteId) continue;
    const found = await tx.diveSite.findUnique({ where: { id: siteId }, select: { id: true } });
    if (!found) throw new BadRequestException(`Dive site ${siteId} does not exist`);
  }
}

function startOfUtcDay(value: string) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    // Backstop for a reference deleted between the check and the write.
    if (e.code === 'P2003') return new BadRequestException('A referenced record does not exist');
    // Unique index hit by a concurrent request (slot, or staff already on trip).
    if (e.code === 'P2002') return new ConflictException('This record already exists');
  }
  return e;
}
