import { ActivityType, CustomerType } from '../generated/prisma/enums.js';

// Net prices in EUR, excluding tax (IGIC; its rate is in the center
// settings). They must match the public site's catalogue
// (frontend/src/lib/booking-catalog.ts) exactly: invoices are built from
// these, never from a price a browser sent.
//
// DM_CERT has no public price yet, so bookings for it cannot be invoiced
// automatically. Add it here once it is set.
export const ACTIVITY_PRICES: Partial<Record<ActivityType, number>> = {
  [ActivityType.SNORKELING]: 25,
  [ActivityType.DISCOVER_SCUBA]: 60,
  [ActivityType.FUN_DIVE]: 45,
  [ActivityType.OW_CERT]: 350,
  [ActivityType.AOW_CERT]: 280,
  [ActivityType.RESCUE_CERT]: 320,
};

export const ACTIVITY_NAMES: Record<ActivityType, string> = {
  [ActivityType.SNORKELING]: 'Snorkeling',
  [ActivityType.DISCOVER_SCUBA]: 'Discover Scuba',
  [ActivityType.FUN_DIVE]: 'Fun Dive',
  [ActivityType.OW_CERT]: 'Open Water Course',
  [ActivityType.AOW_CERT]: 'Advanced Course',
  [ActivityType.RESCUE_CERT]: 'Rescue Course',
  [ActivityType.DM_CERT]: 'Divemaster Course',
};

// Keys as the booking form stores them in notes ("wetsuit:M", "regulator").
export const EQUIPMENT_PRICES = {
  wetsuit: { name: 'Wetsuit', price: 8 },
  bcd: { name: 'BCD', price: 10 },
  regulator: { name: 'Regulator', price: 10 },
  maskFins: { name: 'Mask + Fins', price: 5 },
  computer: { name: 'Dive Computer', price: 12 },
} as const;

export type EquipmentKey = keyof typeof EQUIPMENT_PRICES;

// All five items hired together cost this instead of 45.
export const FULL_PACKAGE_PRICE = 35;


// Fun dives billed together in a stay are priced by how many the customer
// dives in it, as in the previous system: every dive of the stay gets the same
// rate. Net prices, like the rest. Bookings invoiced one at a time and the
// public site keep FUN_DIVE's catalogue price.
export const STAY_DIVE_TIERS = [
  { minDives: 13, price: 38 },
  { minDives: 9, price: 40 },
  { minDives: 6, price: 42 },
  { minDives: 3, price: 44 },
  { minDives: 0, price: 46 },
] as const;

// Locals and recurrent customers pay a flat rate per dive whatever the volume.
export const STAY_DIVE_FLAT_PRICES: Partial<Record<CustomerType, number>> = {
  [CustomerType.LOCAL]: 35,
  [CustomerType.RECURRENT]: 32,
};

export function stayDivePrice(customerType: CustomerType, totalDives: number) {
  return (
    STAY_DIVE_FLAT_PRICES[customerType] ??
    STAY_DIVE_TIERS.find((t) => totalDives >= t.minDives)!.price
  );
}
