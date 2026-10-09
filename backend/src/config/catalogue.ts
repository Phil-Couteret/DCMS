import { ActivityType, BookingAddOn, CustomerType, InsurancePeriod } from '../generated/prisma/enums.js';

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
  addOns: Record<BookingAddOn, number>;
  divePacks: DivePack[]; // ascending diveCount
  insurance: Record<InsurancePeriod, number>; // dive insurance, per period of cover
}

// Dive insurance periods: the pricing API's keys, their names on invoices,
// and their length in days.
export const INSURANCE_KEYS = {
  day: InsurancePeriod.DAY,
  week: InsurancePeriod.WEEK,
  month: InsurancePeriod.MONTH,
  year: InsurancePeriod.YEAR,
} as const;

export const INSURANCE_NAMES: Record<InsurancePeriod, string> = {
  [InsurancePeriod.DAY]: '1 day',
  [InsurancePeriod.WEEK]: '1 week',
  [InsurancePeriod.MONTH]: '1 month',
  [InsurancePeriod.YEAR]: '1 year',
};

const INSURANCE_DAYS: [InsurancePeriod, number][] = [
  [InsurancePeriod.DAY, 1],
  [InsurancePeriod.WEEK, 7],
  [InsurancePeriod.MONTH, 31],
  [InsurancePeriod.YEAR, 366],
];

// The shortest insurance that covers so many days of diving (a year for
// anything longer).
export function insurancePeriodFor(days: number): InsurancePeriod {
  return (INSURANCE_DAYS.find(([, length]) => days <= length) ?? INSURANCE_DAYS[INSURANCE_DAYS.length - 1])[0];
}

// Every activity but snorkeling is diving, and needs insurance or a waiver.
export const isDiving = (activity: ActivityType) => activity !== ActivityType.SNORKELING;

// A fixed price for so many fun dives, per diver.
export interface DivePack {
  diveCount: number;
  price: number;
}

// Add-ons: the night dive surcharge is per diver, the personal instructor
// fee per booking. The pricing API's keys are in ADD_ON_KEYS.
export const ADD_ON_NAMES: Record<BookingAddOn, string> = {
  [BookingAddOn.NIGHT_DIVE]: 'Night dive surcharge',
  [BookingAddOn.PERSONAL_INSTRUCTOR]: 'Personal instructor',
};

export const ADD_ON_KEYS = {
  nightDive: BookingAddOn.NIGHT_DIVE,
  personalInstructor: BookingAddOn.PERSONAL_INSTRUCTOR,
} as const satisfies Record<string, BookingAddOn>;

export const PER_DIVER_ADD_ONS: BookingAddOn[] = [BookingAddOn.NIGHT_DIVE];

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
