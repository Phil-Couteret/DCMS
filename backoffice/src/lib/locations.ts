import type { LocationRef, LocationType } from "@/lib/api";

export const LOCATION_TYPES: LocationType[] = ["DIVING", "BIKE", "SURF", "KITE"];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  DIVING: "Diving",
  BIKE: "Bike rental",
  SURF: "Surf",
  KITE: "Kite surf",
};

// The choices of a location selector: the active locations, plus the one
// currently assigned if it has since been deactivated, so that saving does
// not silently unassign it.
export function locationOptions(active: LocationRef[], current: LocationRef | null) {
  return current && !active.some((l) => l.id === current.id) ? [...active, current] : active;
}

// "Calle Mayor 1, Caleta de Fuste", or null when no street or city is set.
export function shortAddress(address: { street?: string; city?: string } | null) {
  const parts = [address?.street, address?.city].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
