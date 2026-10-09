import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { ActivityType, BookingSource, BookingStatus, TimeSlot } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { usableBono } from '../bonos/bono-rules.js';
import { accountForCustomer } from '../users/accounts.js';
import { equipmentSelection, lockPrices } from '../billing/price-lines.js';
import { PricingService } from '../settings/pricing.service.js';
import { assertShoreStart, placeOnShoreTrip, shoreSite } from '../trips/shore.js';
import { requireTenantId } from '../tenant/tenant-context.js';
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
  partner: { select: { id: true, name: true } },
  trip: { select: { id: true, isShore: true, startTime: true } },
  bono: { select: { id: true, code: true, type: true, discountValue: true, description: true } },
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
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

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

  // A boat booking (boatId) holds seats on the boat; a shore booking
  // (shoreTime, no boat) goes on the shore trip for its site, date and start
  // time, made when needed.
  async create(dto: CreateBookingDto) {
    const date = startOfUtcDay(dto.date);
    const status = dto.status ?? BookingStatus.PENDING;
    if (!dto.boatId === !dto.shoreTime) {
      throw new BadRequestException('Give a boat, or a shore time for a shore booking (not both)');
    }
    // The prices in force now are the booking's (see price-lines.ts).
    const locked = await this.lockedNow({ activityType: dto.activityType, notes: dto.notes ?? null });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await assertReferences(tx, dto);
        const { bonoCode, ...fields } = dto;
        const bonoId = bonoCode ? (await usableBono(tx, bonoCode, date)).id : null;
        if (dto.boatId) {
          if (SEAT_HOLDING.includes(status)) {
            await assertSeats(tx, { ...dto, boatId: dto.boatId, date });
          } else {
            await lockBoat(tx, dto.boatId);
          }
          return tx.booking.create({ data: { ...withPartnerSource(fields), date, status, bonoId, ...locked }, include: INCLUDE });
        }
        const site = await shoreSite(tx, dto.siteId);
        assertShoreStart(dto.timeSlot, dto.shoreTime!);
        const tripId = SEAT_HOLDING.includes(status)
          ? await placeOnShoreTrip(tx, { ...dto, date, shoreTime: dto.shoreTime!, siteId: site.id })
          : null;
        return tx.booking.create({
          data: { ...withPartnerSource(fields), date, status, bonoId, siteId: site.id, locationId: site.locationId, tripId, ...locked },
          include: INCLUDE,
        });
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateBookingDto) {
    const current = await this.findOne(id);
    if (dto.partnerId !== undefined && dto.partnerId !== current.partnerId && current.partnerInvoiceId) {
      throw new ConflictException("This booking is on a partner invoice; cancel that invoice to change its partner");
    }
    const date = dto.date !== undefined ? startOfUtcDay(dto.date) : undefined;
    // Giving a boat makes it a boat booking, giving a shore time a shore one.
    const boatId = dto.boatId !== undefined ? dto.boatId : dto.shoreTime ? null : current.boatId;
    const shoreTime = dto.shoreTime !== undefined ? dto.shoreTime : dto.boatId ? null : current.shoreTime;
    if (!boatId === !shoreTime) {
      throw new BadRequestException('Give a boat, or a shore time for a shore booking (not both)');
    }
    const next = {
      boatId,
      shoreTime,
      date: date ?? current.date,
      timeSlot: dto.timeSlot ?? current.timeSlot,
      participantCount: dto.participantCount ?? current.participantCount,
      status: dto.status ?? current.status,
    };
    try {
      return await this.prisma.$transaction(async (tx) => {
        await assertReferences(tx, dto);
        const { bonoCode, ...fields } = dto;
        const bonoId = await bonoChange(tx, current, bonoCode, date);
        const placement: Prisma.BookingUncheckedUpdateInput = { boatId, shoreTime, ...(await this.relock(current, dto)) };
        const onShoreTrip = current.trip?.isShore ?? false;
        if (boatId) {
          if (SEAT_HOLDING.includes(next.status)) await assertSeats(tx, { ...next, boatId }, id);
          // A booking leaving the shore leaves its shore trip.
          if (onShoreTrip) placement.tripId = null;
        } else {
          const siteId = dto.siteId !== undefined ? dto.siteId : current.boatId ? null : current.siteId;
          const site = await shoreSite(tx, siteId);
          assertShoreStart(next.timeSlot, shoreTime!);
          placement.siteId = site.id;
          placement.locationId = site.locationId;
          const moved =
            !onShoreTrip ||
            current.shoreTime !== shoreTime ||
            current.date.getTime() !== next.date.getTime() ||
            current.timeSlot !== next.timeSlot ||
            current.siteId !== site.id;
          if (SEAT_HOLDING.includes(next.status) && (moved || next.participantCount !== current.participantCount)) {
            placement.tripId = await placeOnShoreTrip(tx, { id, ...next, shoreTime: shoreTime!, siteId: site.id });
          }
        }
        return tx.booking.update({
          where: { id },
          data: {
            ...withPartnerSource(fields),
            ...(date && { date }),
            ...(bonoId !== undefined && { bonoId }),
            ...placement,
          },
          include: INCLUDE,
        });
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  // The prices to lock on a booking now. A center whose price list cannot be
  // read (it should always have one) still takes the booking, unlocked: it is
  // then billed at the price list of the day, as bookings from before locking.
  private async lockedNow(booking: { activityType: ActivityType; notes: string | null }): Promise<ReturnType<typeof lockPrices> | null> {
    try {
      return lockPrices(await this.pricing.current(), booking);
    } catch (e) {
      this.logger.warn(`Booking prices not locked: ${(e as Error).message}`);
      return null;
    }
  }

  // An edit that changes what is booked takes the current prices for that
  // part: a new activity its price, a different equipment set its price.
  // The rest keeps the prices locked when it was booked. A booking from
  // before prices were locked stays unlocked (it uses the current list).
  private async relock(
    current: { activityType: ActivityType; notes: string | null; pricePerDiver: unknown },
    dto: UpdateBookingDto,
  ): Promise<Prisma.BookingUncheckedUpdateInput> {
    if (current.pricePerDiver === null) return {};
    const activityChanged = dto.activityType !== undefined && dto.activityType !== current.activityType;
    const equipmentChanged = dto.notes !== undefined && equipmentSelection(dto.notes ?? null) !== equipmentSelection(current.notes);
    if (!activityChanged && !equipmentChanged) return {};
    const now = await this.lockedNow({
      activityType: dto.activityType ?? current.activityType,
      notes: dto.notes !== undefined ? (dto.notes ?? null) : current.notes,
    });
    if (!now) return {};
    return {
      ...(activityChanged && { pricePerDiver: now.pricePerDiver }),
      ...(equipmentChanged && { equipmentPrice: now.equipmentPrice }),
    };
  }

  // Public booking without an account. Finds or creates the user and customer
  // by email, then books the first active boat with room in that slot.
  async createGuest(dto: GuestBookingDto) {
    const date = startOfUtcDay(dto.date);
    const email = dto.email.toLowerCase();
    const notes = JSON.stringify({
      certificationLevel: dto.certificationLevel ?? null,
      selectedEquipment: dto.selectedEquipment ?? [],
      totalPrice: dto.totalPrice ?? null,
    });
    // The guest pays the prices shown now: they are locked on the booking.
    const locked = await this.lockedNow({ activityType: dto.activityType, notes });
    const booking = await this.prisma.$transaction(async (tx) => {
      if (dto.siteId) {
        const site = await tx.diveSite.findUnique({ where: { id: dto.siteId }, select: { id: true } });
        if (!site) throw new NotFoundException(`Dive site ${dto.siteId} not found`);
      }

      // An existing customer's details are left untouched: this route is
      // public, and anyone who knows an email address must not be able to
      // rewrite that customer's name or phone. A customer at another company
      // is separate (accounts are per tenant).
      const customer =
        (await tx.customer.findFirst({ where: { user: { email } }, select: { id: true } })) ??
        (await tx.customer.create({
          data: {
            userId: await accountForCustomer(tx, requireTenantId(), email),
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
          siteId: dto.siteId ?? null,
          activityType: dto.activityType,
          date,
          timeSlot: dto.timeSlot,
          participantCount: dto.participantCount,
          status: BookingStatus.PENDING,
          bookingSource: BookingSource.DIRECT,
          notes,
          ...locked,
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
    SELECT capacity FROM "Boat" WHERE id = ${boatId} AND "tenantId" = ${requireTenantId()} FOR UPDATE`;
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
export async function firstBoatWithRoom(tx: Tx, slot: Omit<Slot, 'boatId'>) {
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

// The booking's bono after an update: undefined to leave it, null to remove
// it, or the id of the bono named. A new code, or a new date, is checked
// against the bono's dates; once its use has been counted (the booking is
// invoiced) the bono cannot change.
async function bonoChange(
  tx: Tx,
  current: { bonoId: string | null; bonoUsed: boolean; bono: { code: string } | null; date: Date },
  bonoCode: string | null | undefined,
  date: Date | undefined,
) {
  const code = bonoCode === undefined ? current.bono?.code : bonoCode?.trim().toUpperCase() || null;
  const changed = (code ?? null) !== (current.bono?.code ?? null);
  if (current.bonoUsed) {
    if (changed) throw new ConflictException('This booking has been invoiced with its bono; cancel the invoice to change it');
    return undefined;
  }
  if (!code) return changed ? null : undefined;
  if (!changed && date === undefined) return undefined;
  return (await usableBono(tx, code, date ?? current.date)).id;
}

// A booking with a partner is a partner booking.
function withPartnerSource<T extends { partnerId?: string | null; bookingSource?: BookingSource }>(dto: T): T {
  return dto.partnerId ? { ...dto, bookingSource: BookingSource.PARTNER } : dto;
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
