import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  ActivityType,
  BookingStatus,
  SkillLevel,
  StaffStatus,
  TimeSlot,
  TripStatus,
} from '../generated/prisma/enums.js';
import { tripAtLocation } from './location-filter.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SEAT_HOLDING, tripCapacity, tripIssues } from './trip-rules.js';
import { TripsService } from './trips.service.js';

// What staff need to know about a diver while preparing a trip.
const PREP_CUSTOMER = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    gender: true,
    country: true,
    centerSkillLevel: true,
    isApproved: true,
    medicalCertExpiry: true,
    insuranceExpiry: true,
    ownEquipment: true,
    tankSize: true,
    bcdSize: true,
    wetsuitSize: true,
    finsSize: true,
    bootsSize: true,
    certifications: { select: { agency: true, level: true, expiryDate: true } },
  },
} satisfies Prisma.CustomerDefaultArgs;

const PREP_BOOKING = {
  id: true,
  tripId: true,
  boatId: true,
  activityType: true,
  participantCount: true,
  status: true,
  createdAt: true,
  customer: PREP_CUSTOMER,
} satisfies Prisma.BookingSelect;

const PREP_TRIP = {
  boat: { select: { id: true, name: true, capacity: true } },
  plannedSite: { select: { id: true, nameEn: true } },
  actualSite: { select: { id: true, nameEn: true } },
  staff: {
    include: { staff: { select: { id: true, firstName: true, lastName: true, type: true } } },
    orderBy: { role: 'asc' },
  },
  bookings: {
    where: { status: { in: SEAT_HOLDING } },
    select: PREP_BOOKING,
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.TripInclude;

type PrepBooking = Prisma.BookingGetPayload<{ select: typeof PREP_BOOKING }>;
type PrepCustomer = PrepBooking['customer'];

// Activities that need the diver to hold a certification already.
const CERTIFIED_ACTIVITIES: ActivityType[] = [
  ActivityType.FUN_DIVE,
  ActivityType.AOW_CERT,
  ActivityType.RESCUE_CERT,
  ActivityType.DM_CERT,
];

// Hardest site (difficulty 1-5) each skill level is taken to. Divers not yet
// assessed count as beginners.
const MAX_DIFFICULTY: Record<SkillLevel, number> = {
  [SkillLevel.BEGINNER]: 2,
  [SkillLevel.INTERMEDIATE]: 3,
  [SkillLevel.ADVANCED]: 4,
  [SkillLevel.EXPERT]: 5,
};
const SKILL_ORDER: SkillLevel[] = [
  SkillLevel.BEGINNER,
  SkillLevel.INTERMEDIATE,
  SkillLevel.ADVANCED,
  SkillLevel.EXPERT,
];

// Certification levels (as recorded on the customer) in rank order. A site's
// requiredCertLevel is an index into Open Water, Advanced, Rescue,
// Divemaster, Instructor, so rank - 1 is compared with it.
const CERT_RANK: Record<string, number> = {
  openWater: 1,
  advanced: 2,
  rescue: 3,
  divemaster: 4,
  instructor: 5,
};

// A site is not suggested to divers who dived it within this many days.
const RECENT_DAYS = 3;
const MAX_SUGGESTIONS = 5;

const DAY_MS = 86_400_000;

@Injectable()
export class DivePrepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  // Everything the preparation screen needs for one date and time slot,
  // optionally for one location: its trips, bookings, boats and sites. Staff
  // are not tied to a location and are always all listed.
  async slot(dateIso: string, timeSlot: TimeSlot, locationId?: string) {
    const date = startOfUtcDay(dateIso);
    const atLocation = locationId ? { locationId } : {};
    const [trips, unassigned, pending, boats, staff, sites] = await Promise.all([
      this.prisma.trip.findMany({
        where: { date, timeSlot, status: { not: TripStatus.CANCELLED }, ...tripAtLocation(locationId) },
        include: PREP_TRIP,
        orderBy: [{ isShore: 'asc' }, { boat: { name: 'asc' } }, { startTime: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.booking.findMany({
        where: { date, timeSlot, tripId: null, status: BookingStatus.CONFIRMED, ...atLocation },
        select: PREP_BOOKING,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.booking.count({ where: { date, timeSlot, tripId: null, status: BookingStatus.PENDING, ...atLocation } }),
      this.prisma.boat.findMany({
        where: { status: 'active', ...atLocation },
        select: { id: true, name: true, capacity: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.staff.findMany({
        where: { status: StaffStatus.ACTIVE },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          type: true,
          trips: {
            where: { trip: { date, timeSlot, status: { not: TripStatus.CANCELLED } } },
            select: { tripId: true, role: true },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.diveSite.findMany({
        where: atLocation,
        select: { id: true, nameEn: true, difficultyLevel: true, requiredCertLevel: true },
        orderBy: { nameEn: 'asc' },
      }),
    ]);

    const customerIds = [...new Set(trips.flatMap((t) => t.bookings.map((b) => b.customer.id)))];
    const recent = await this.recentSites(customerIds, date);

    const withBoat = new Set(trips.map((t) => t.boatId).filter(Boolean));
    return {
      date: date.toISOString(),
      timeSlot,
      trips: trips.map((t) => ({
        ...t,
        bookings: t.bookings.map((b) => withWarnings(b, date)),
        issues: tripIssues(t),
        capacity: tripCapacity(t),
        suggestedSites: suggestSites(
          t.bookings.map((b) => ({ customer: b.customer, activityType: b.activityType })),
          sites,
          recent,
        ),
      })),
      unassigned: unassigned.map((b) => withWarnings(b, date)),
      pendingCount: pending,
      boatsWithoutTrip: boats.filter((b) => !withBoat.has(b.id)),
      hasShoreTrip: trips.some((t) => t.boatId === null),
      staff: staff.map(({ trips: on, ...s }) => ({ ...s, tripId: on[0]?.tripId ?? null, role: on[0]?.role ?? null })),
      sites: sites.map(({ requiredCertLevel: _r, ...s }) => s),
    };
  }

  // Puts the slot's confirmed bookings that are on no trip onto its planned
  // trips: all on one trip if one has room for everyone, otherwise diver by
  // diver, beginners first, preferring a trip whose divers are all of the
  // same skill level (or that is empty). Bookings are moved to the trip's
  // boat. Bookings that fit nowhere are reported, not forced. With a
  // location, only that location's bookings and trips.
  async autoAssign(dateIso: string, timeSlot: TimeSlot, locationId?: string) {
    const date = startOfUtcDay(dateIso);
    // Boat bookings onto boat trips. Shore bookings are put on their shore
    // session when booked.
    const trips = await this.prisma.trip.findMany({
      where: { date, timeSlot, status: TripStatus.PLANNED, isShore: false, ...tripAtLocation(locationId) },
      include: PREP_TRIP,
      orderBy: [{ isShore: 'asc' }, { boat: { name: 'asc' } }, { startTime: 'asc' }, { createdAt: 'asc' }],
    });
    const candidates = await this.prisma.booking.findMany({
      where: { date, timeSlot, tripId: null, boatId: { not: null }, status: BookingStatus.CONFIRMED, ...(locationId && { locationId }) },
      select: PREP_BOOKING,
      orderBy: { createdAt: 'asc' },
    });
    if (candidates.length === 0 || trips.length === 0) {
      return { assigned: 0, skipped: candidates.map((b) => skip(b, trips.length === 0 ? 'No planned trip in this slot' : '')) };
    }

    const plan = trips.map((t) => ({
      id: t.id,
      room: tripCapacity(t).available,
      skills: new Set(t.bookings.map((b) => skillOf(b.customer))),
    }));
    const wanted = candidates.reduce((n, b) => n + b.participantCount, 0);
    const moves: { booking: PrepBooking; tripId: string }[] = [];
    const single = plan.find((p) => p.room >= wanted);
    if (single) {
      for (const b of candidates) moves.push({ booking: b, tripId: single.id });
    } else {
      const bySkill = [...candidates].sort(
        (a, b) => SKILL_ORDER.indexOf(skillOf(a.customer)) - SKILL_ORDER.indexOf(skillOf(b.customer)),
      );
      for (const b of bySkill) {
        const skill = skillOf(b.customer);
        const fits = plan.filter((p) => p.room >= b.participantCount);
        const target =
          fits.find((p) => p.skills.size === 0 || (p.skills.size === 1 && p.skills.has(skill))) ?? fits[0];
        if (!target) continue;
        target.room -= b.participantCount;
        target.skills.add(skill);
        moves.push({ booking: b, tripId: target.id });
      }
    }

    let assigned = 0;
    const skipped: ReturnType<typeof skip>[] = [];
    const moved = new Set<string>();
    for (const { booking, tripId } of moves) {
      try {
        await this.trips.linkBooking(tripId, booking.id, { reassignBoat: true });
        assigned += 1;
        moved.add(booking.id);
      } catch (e) {
        skipped.push(skip(booking, e instanceof Error ? e.message : 'Could not be added'));
      }
    }
    for (const b of candidates) {
      if (!moved.has(b.id) && !skipped.some((s) => s.bookingId === b.id)) {
        skipped.push(skip(b, 'No trip has room'));
      }
    }
    return { assigned, skipped };
  }

  // Completed trips of a day with what Spanish dive regulations (RD 933/2021)
  // ask to be recorded: site, times, crew and each diver's gender,
  // certification and nationality.
  async compliance(dateIso: string) {
    const date = startOfUtcDay(dateIso);
    const trips = await this.prisma.trip.findMany({
      where: { date, status: TripStatus.COMPLETED },
      include: PREP_TRIP,
      orderBy: [{ timeSlot: 'asc' }, { isShore: 'asc' }, { boat: { name: 'asc' } }, { startTime: 'asc' }],
    });
    return {
      date: date.toISOString(),
      trips: trips.map((t) => {
        const divers = t.bookings.map((b) => ({
          bookingId: b.id,
          customerId: b.customer.id,
          name: `${b.customer.firstName} ${b.customer.lastName}`,
          gender: b.customer.gender,
          nationality: b.customer.country,
          certification: highestCertification(b.customer),
          // Everyone on a booking dives; only the lead is named.
          companions: b.participantCount - 1,
        }));
        const count = (g: string | null) => divers.filter((d) => d.gender === g).length;
        const totalDivers = t.bookings.reduce((n, b) => n + b.participantCount, 0);
        return {
          id: t.id,
          timeSlot: t.timeSlot,
          boat: t.boat,
          plannedSite: t.plannedSite,
          actualSite: t.actualSite ?? t.plannedSite,
          entryTime: t.entryTime,
          exitTime: t.exitTime,
          reportNotes: t.reportNotes,
          completedAt: t.completedAt,
          captain: t.staff.find((s) => s.role === 'CAPTAIN')?.staff ?? null,
          guides: t.staff.filter((s) => s.role !== 'CAPTAIN').map((s) => ({ ...s.staff, role: s.role })),
          divers,
          totals: {
            divers: totalDivers,
            male: count('male'),
            female: count('female'),
            // Companions have no recorded gender.
            unspecified: totalDivers - count('male') - count('female'),
          },
        };
      }),
    };
  }

  // Sites the customers dived in the days before the date: their trips'
  // sites and their dive logs.
  private async recentSites(customerIds: string[], date: Date) {
    const recent = new Map<string, Set<string>>();
    if (customerIds.length === 0) return recent;
    const since = new Date(date.getTime() - RECENT_DAYS * DAY_MS);
    const [bookings, logs] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          customerId: { in: customerIds },
          date: { gte: since, lt: date },
          status: { in: SEAT_HOLDING },
          trip: { status: { not: TripStatus.CANCELLED } },
        },
        select: { customerId: true, trip: { select: { plannedSiteId: true, actualSiteId: true } } },
      }),
      this.prisma.diveLogParticipant.findMany({
        where: { customerId: { in: customerIds }, diveLog: { date: { gte: since, lt: date } } },
        select: { customerId: true, diveLog: { select: { siteId: true } } },
      }),
    ]);
    const add = (customerId: string, siteId: string | null | undefined) => {
      if (!siteId) return;
      if (!recent.has(customerId)) recent.set(customerId, new Set());
      recent.get(customerId)!.add(siteId);
    };
    for (const b of bookings) add(b.customerId, b.trip?.actualSiteId ?? b.trip?.plannedSiteId);
    for (const l of logs) add(l.customerId, l.diveLog.siteId);
    return recent;
  }
}

function skillOf(customer: { centerSkillLevel: SkillLevel | null }) {
  return customer.centerSkillLevel ?? SkillLevel.BEGINNER;
}

function certRank(customer: { certifications: { level: string }[] }) {
  return Math.max(0, ...customer.certifications.map((c) => CERT_RANK[c.level] ?? 0));
}

function highestCertification(customer: { certifications: { agency: string; level: string }[] }) {
  const best = [...customer.certifications].sort((a, b) => (CERT_RANK[b.level] ?? 0) - (CERT_RANK[a.level] ?? 0))[0];
  return best ? { agency: best.agency, level: best.level } : null;
}

// Things to check with the diver before they get on the boat.
function withWarnings(booking: PrepBooking, date: Date) {
  const c = booking.customer;
  const warnings: string[] = [];
  if (!c.isApproved) warnings.push('Not approved for booking');
  if (c.medicalCertExpiry && c.medicalCertExpiry < date) warnings.push('Medical certificate expired');
  if (c.insuranceExpiry && c.insuranceExpiry < date) warnings.push('Insurance expired');
  if (CERTIFIED_ACTIVITIES.includes(booking.activityType) && c.certifications.length === 0) {
    warnings.push('No certification recorded');
  }
  return { ...booking, warnings };
}

// Up to five sites for the trip's divers: no harder than the least skilled
// diver's level allows, within the certification of the least certified
// diver on a certified activity, and not dived by any of them in the last
// few days. With no divers yet, any site.
function suggestSites(
  divers: { customer: PrepCustomer; activityType: ActivityType }[],
  sites: { id: string; nameEn: string; difficultyLevel: number; requiredCertLevel: number }[],
  recent: Map<string, Set<string>>,
) {
  const maxDifficulty = Math.min(5, ...divers.map((d) => MAX_DIFFICULTY[skillOf(d.customer)]));
  const certified = divers
    .filter((d) => CERTIFIED_ACTIVITIES.includes(d.activityType))
    .map((d) => certRank(d.customer))
    .filter((r) => r > 0);
  const minCert = certified.length > 0 ? Math.min(...certified) : null;
  const dived = new Set(divers.flatMap((d) => [...(recent.get(d.customer.id) ?? [])]));
  return sites
    .filter(
      (s) =>
        s.difficultyLevel <= maxDifficulty &&
        (minCert === null || s.requiredCertLevel <= minCert - 1) &&
        !dived.has(s.id),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map(({ requiredCertLevel: _r, ...s }) => s);
}

function skip(b: PrepBooking, reason: string) {
  return {
    bookingId: b.id,
    customer: `${b.customer.firstName} ${b.customer.lastName}`,
    reason,
  };
}

function startOfUtcDay(value: string) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
