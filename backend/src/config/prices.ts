import { ActivityType } from '../generated/prisma/enums.js';

// Net prices in EUR, excluding IGIC. They must match the public site's
// catalogue (frontend/src/lib/booking-catalog.ts) exactly: invoices are built
// from these, never from a price a browser sent.
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

// IGIC, the Canary Islands indirect tax, general rate. Prices above are net.
// To be confirmed with the accountant.
export const IGIC_RATE = 0.07;
