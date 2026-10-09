import { BookingStatus, StaffType, TimeSlot, TripStaffRole } from '../generated/prisma/enums.js';

// Statuses that hold a place on a trip. CANCELLED and NO_SHOW free theirs.
export const SEAT_HOLDING: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

// Which staff types may take each trip role: captains skipper, guides and
// trainers lead divers.
export const ROLE_STAFF_TYPES: Record<TripStaffRole, StaffType[]> = {
  [TripStaffRole.CAPTAIN]: [StaffType.CAPTAIN],
  [TripStaffRole.GUIDE]: [StaffType.GUIDE, StaffType.TRAINER],
  [TripStaffRole.TRAINEE_GUIDE]: [StaffType.GUIDE, StaffType.TRAINER],
};

// Slots that need at least one guide in the water. Night dives are shore
// dives led from the beach and have no such rule.
const GUIDED_SLOTS: TimeSlot[] = [TimeSlot.MORNING, TimeSlot.AFTERNOON];

interface TripShape {
  timeSlot: TimeSlot;
  maxDivers: number;
  plannedSiteId: string | null;
  boat: { capacity: number } | null;
  staff: { role: TripStaffRole }[];
  bookings: { status: BookingStatus; participantCount: number }[];
}

// Divers holding a place, the crew, and how many more divers fit: on a boat
// the crew takes seats too, so the tighter of maxDivers and the boat's
// capacity after crew applies.
export function tripCapacity(trip: TripShape) {
  const divers = trip.bookings
    .filter((b) => SEAT_HOLDING.includes(b.status))
    .reduce((n, b) => n + b.participantCount, 0);
  const crew = trip.staff.length;
  const limit = trip.boat ? Math.min(trip.maxDivers, trip.boat.capacity - crew) : trip.maxDivers;
  return { divers, crew, limit, available: limit - divers };
}

// What stops the trip from leaving. Checked before it moves to ACTIVE and
// shown while it is prepared.
export function tripIssues(trip: TripShape) {
  const issues: string[] = [];
  const has = (role: TripStaffRole) => trip.staff.some((s) => s.role === role);
  const { divers, crew, limit } = tripCapacity(trip);
  if (trip.boat && !has(TripStaffRole.CAPTAIN)) issues.push('Captain required for boat dives');
  if (GUIDED_SLOTS.includes(trip.timeSlot) && !has(TripStaffRole.GUIDE)) {
    issues.push('At least one guide required for morning and afternoon dives');
  }
  if (divers === 0) issues.push('No divers assigned');
  if (trip.boat && divers > 0 && !trip.plannedSiteId) issues.push('Dive site not selected');
  if (divers > limit) {
    issues.push(
      trip.boat
        ? `Over capacity: ${divers} divers and ${crew} crew for ${trip.boat.capacity} places` +
            (trip.maxDivers < trip.boat.capacity - crew ? ` (trip limit ${trip.maxDivers} divers)` : '')
        : `Over capacity: ${divers} divers for ${trip.maxDivers} places`,
    );
  }
  return issues;
}

// Crew a boat takes out besides the divers: a captain and a guide.
export const BOAT_CREW = 2;

// How many boats it takes to seat so many divers, filling the largest boats
// first, each with its crew aboard. More than the fleet can seat: one boat
// per boat there is, plus the divers still without a seat.
export function boatsNeeded(divers: number, capacities: number[]) {
  if (divers <= 0) return { boats: 0, unseated: 0 };
  let left = divers;
  let boats = 0;
  for (const capacity of [...capacities].sort((a, b) => b - a)) {
    if (left <= 0) break;
    boats += 1;
    left -= Math.max(0, capacity - BOAT_CREW);
  }
  return { boats, unseated: Math.max(0, left) };
}
