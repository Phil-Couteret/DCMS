import { ActivityType, CustomerType } from '../generated/prisma/enums.js';

// What the center sells. The prices are in the database (ActivityPrice,
// EquipmentPrice, FunDiveTier), edited in Settings → Pricing and read
// through PricingService, which returns a PriceList.

export const ACTIVITY_NAMES: Record<ActivityType, string> = {
  [ActivityType.SNORKELING]: 'Snorkeling',
  [ActivityType.DISCOVER_SCUBA]: 'Discover Scuba',
  [ActivityType.FUN_DIVE]: 'Fun Dive',
  [ActivityType.OW_CERT]: 'Open Water Course',
  [ActivityType.AOW_CERT]: 'Advanced Course',
  [ActivityType.RESCUE_CERT]: 'Rescue Course',
  [ActivityType.DM_CERT]: 'Divemaster Course',
};

// The keys of the pricing API, which the public site and the backoffice use.
export const ACTIVITY_KEYS = {
  snorkeling: ActivityType.SNORKELING,
  discoverScuba: ActivityType.DISCOVER_SCUBA,
  funDive: ActivityType.FUN_DIVE,
  owCert: ActivityType.OW_CERT,
  aowCert: ActivityType.AOW_CERT,
  rescueCert: ActivityType.RESCUE_CERT,
  dmCert: ActivityType.DM_CERT,
} as const satisfies Record<string, ActivityType>;

export type ActivityKey = keyof typeof ACTIVITY_KEYS;

// Rental items. noteKey is how the public booking form stores the item in a
// booking's notes ("wetsuit:M", "computer").
export const EQUIPMENT_ITEMS = {
  wetsuit: { name: 'Wetsuit', noteKey: 'wetsuit' },
  bcd: { name: 'BCD', noteKey: 'bcd' },
  regulator: { name: 'Regulator', noteKey: 'regulator' },
  maskFins: { name: 'Mask + Fins', noteKey: 'maskFins' },
  diveComputer: { name: 'Dive Computer', noteKey: 'computer' },
} as const;

export type EquipmentKey = keyof typeof EQUIPMENT_ITEMS;

// The EquipmentPrice row for all five items hired together.
export const FULL_PACKAGE_KEY = 'fullPackage';

export interface FunDiveTier {
  minDives: number;
  tourist: number;
  local: number;
  recurrent: number;
}

// Net prices in EUR at one moment, as invoices are built from them.
export interface PriceList {
  activities: Record<ActivityType, number | null>; // null: no price, cannot be invoiced
  equipment: Record<EquipmentKey, number>;
  fullPackage: number;
  funDiveTiers: FunDiveTier[]; // ascending minDives, the first at 1
}

const TIER_RATE = {
  [CustomerType.TOURIST]: 'tourist',
  [CustomerType.LOCAL]: 'local',
  [CustomerType.RECURRENT]: 'recurrent',
} as const satisfies Record<CustomerType, keyof FunDiveTier>;

// How many units of its activity price a booking is billed: one per diver,
// and for fun dives one per diver per dive. Courses, snorkeling and the like
// are priced per person whatever the number of dives.
export function billedUnits(b: { activityType: ActivityType; participantCount: number; numberOfDives: number }) {
  return b.participantCount * (b.activityType === ActivityType.FUN_DIVE ? b.numberOfDives : 1);
}

// "Fun Dive (3 dives)" when a booking has several, else the activity name.
export function withDives(b: { activityType: ActivityType; numberOfDives: number }) {
  const name = ACTIVITY_NAMES[b.activityType];
  return b.numberOfDives > 1 ? `${name} (${b.numberOfDives} dives)` : name;
}

// Fun dives billed together in a stay are priced by how many the customer
// dives in it, as in the previous system: every dive of the stay gets the
// same rate, the customer type's rate in the highest tier reached. Bookings
// invoiced one at a time and the public site use FUN_DIVE's price instead.
export function stayDivePrice(prices: PriceList, customerType: CustomerType, totalDives: number) {
  const tiers = prices.funDiveTiers;
  const tier = tiers.findLast((t) => totalDives >= t.minDives) ?? tiers[0];
  return tier[TIER_RATE[customerType]];
}
