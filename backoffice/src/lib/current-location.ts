import { cookies } from "next/headers";
import { cache } from "react";
import { getLocations, type LocationRef } from "@/lib/api";
import { LOCATION_COOKIE } from "@/lib/location-cookie";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The center's active locations, read once per request (the layout's
// switcher and the page both need them).
export const activeLocations = cache(async (): Promise<LocationRef[]> => {
  try {
    return (await getLocations(true)).map(({ id, name }) => ({ id, name }));
  } catch {
    return [];
  }
});

// The location the whole backoffice is narrowed to, chosen with the switcher
// at the top of every page (a cookie). undefined: all locations. A location
// that is no longer active, or another center's, counts as none.
export async function chosenLocation(): Promise<string | undefined> {
  const value = (await cookies()).get(LOCATION_COOKIE)?.value;
  if (!value || !UUID.test(value)) return undefined;
  return (await activeLocations()).some((l) => l.id === value) ? value : undefined;
}

// A page's location: its own ?location= when the URL has one (a link that
// names a location, or "" for all of them), else the switcher's.
export async function pageLocation(param: string | string[] | undefined): Promise<string | undefined> {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === undefined) return chosenLocation();
  return UUID.test(value) ? value : undefined;
}
