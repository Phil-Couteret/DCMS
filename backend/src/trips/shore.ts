import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { TimeSlot, TripStatus } from '../generated/prisma/enums.js';
import { requireTenantId } from '../tenant/tenant-context.js';
import { SEAT_HOLDING } from './trip-rules.js';

// Shore trips: discovery dives, courses and night dives from a beach,
// harbour or pool, with no boat. As in the original system ("Mole" slots), a
// shore session lasts an hour and one starts every 30 minutes, so the times
// overlap: 09:30–10:30, 10:00–11:00, … in the morning. 10:15 is one more
// morning start, the usual time for shore discovery dives.

type Tx = Prisma.TransactionClient;

export const SHORE_SESSION_MINUTES = 60;

function starts(from: string, last: string) {
  const out: string[] = [];
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  for (let m = toMin(from); m <= toMin(last); m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

// The start times of each slot's shore sessions (the last one ends at
// 13:00, 18:00 and 21:30).
export const SHORE_START_TIMES: Record<TimeSlot, string[]> = {
  [TimeSlot.MORNING]: [...starts('09:30', '12:00'), '10:15'].sort(),
  [TimeSlot.AFTERNOON]: starts('14:00', '17:00'),
  [TimeSlot.NIGHT]: starts('19:00', '20:30'),
};

export function assertShoreStart(timeSlot: TimeSlot, startTime: string) {
  if (!SHORE_START_TIMES[timeSlot].includes(startTime)) {
    throw new BadRequestException(
      `A ${timeSlot.toLowerCase()} shore session starts at ${SHORE_START_TIMES[timeSlot].join(', ')}`,
    );
  }
}

// The shore dive site for a shore booking or trip: the one given (it must be
// a shore site), or the center's only shore site at the location when there
// is just one.
export async function shoreSite(tx: Tx, siteId: string | null | undefined, locationId?: string | null) {
  if (siteId) {
    const site = await tx.diveSite.findUnique({ where: { id: siteId }, select: { id: true, isShore: true, locationId: true, nameEn: true } });
    if (!site) throw new BadRequestException('siteId does not match an existing dive site');
    if (!site.isShore) throw new BadRequestException(`${site.nameEn} is not a shore dive site`);
    return site;
  }
  const sites = await tx.diveSite.findMany({
    where: { isShore: true, ...(locationId && { locationId }) },
    select: { id: true, isShore: true, locationId: true, nameEn: true },
    take: 2,
  });
  if (sites.length === 1) return sites[0];
  throw new BadRequestException(
    sites.length === 0
      ? 'There is no shore dive site: mark one as a shore site in Settings → Dive Sites'
      : 'Choose the shore dive site',
  );
}

// The shore trip for this site, date and start time, created when there is
// none. Creation is serialised per slot, so two bookings at once cannot make
// two trips.
export async function shoreTripFor(tx: Tx, at: { date: Date; timeSlot: TimeSlot; startTime: string; siteId: string }) {
  assertShoreStart(at.timeSlot, at.startTime);
  await lockShoreSlot(tx, at);
  const where = { date: at.date, timeSlot: at.timeSlot, startTime: at.startTime, plannedSiteId: at.siteId, isShore: true };
  return (
    (await tx.trip.findFirst({ where, select: { id: true, status: true, maxDivers: true } })) ??
    (await tx.trip.create({ data: { ...where, boatId: null }, select: { id: true, status: true, maxDivers: true } }))
  );
}

export async function lockShoreSlot(tx: Tx, at: { date: Date; timeSlot: TimeSlot; startTime: string | null; siteId: string | null }) {
  const key = `shore:${requireTenantId()}:${at.date.toISOString()}:${at.timeSlot}:${at.startTime ?? '-'}:${at.siteId ?? '-'}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

// Puts a booking on its shore trip (found or created), checking the trip's
// places. Returns the trip's id.
export async function placeOnShoreTrip(
  tx: Tx,
  booking: { id?: string; date: Date; timeSlot: TimeSlot; shoreTime: string; siteId: string; participantCount: number },
) {
  const trip = await shoreTripFor(tx, { ...booking, startTime: booking.shoreTime });
  if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
    throw new ConflictException(`The ${booking.shoreTime} shore session is ${trip.status.toLowerCase()}`);
  }
  const taken = await tx.booking.aggregate({
    _sum: { participantCount: true },
    where: { tripId: trip.id, status: { in: SEAT_HOLDING }, ...(booking.id && { id: { not: booking.id } }) },
  });
  const booked = taken._sum.participantCount ?? 0;
  if (booked + booking.participantCount > trip.maxDivers) {
    throw new ConflictException(
      `The ${booking.shoreTime} shore session is full: ${booked} of ${trip.maxDivers} places taken, ${booking.participantCount} requested`,
    );
  }
  return trip.id;
}
