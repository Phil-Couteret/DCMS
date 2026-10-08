import type { Prisma } from '../generated/prisma/client.js';

// A trip is at a location when its boat operates from there; a shore trip
// (no boat), when its planned site belongs to it.
export function tripAtLocation(locationId: string | undefined): Prisma.TripWhereInput {
  if (!locationId) return {};
  return { OR: [{ boat: { locationId } }, { boatId: null, plannedSite: { locationId } }] };
}
