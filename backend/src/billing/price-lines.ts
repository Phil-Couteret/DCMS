import { Prisma } from '../generated/prisma/client.js';
import type { BookingAddOn } from '../generated/prisma/enums.js';
import {
  ADD_ON_NAMES,
  EQUIPMENT_ITEMS,
  PER_DIVER_ADD_ONS,
  type EquipmentKey,
  type FunDiveTier,
  type PriceList,
} from '../config/catalogue.js';
import type { ActivityType } from '../generated/prisma/enums.js';
import type { InvoiceItemDto } from './dto/invoice-item.dto.js';

// What a booking costs: its invoice lines for equipment and add-ons, and the
// prices it was booked at. Prices are locked on the booking when it is made
// (lockPrices), so a later change to the price list does not reprice it; a
// booking from before locking (null prices) uses the current price list.

const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;

// A booking's add-ons: the night dive surcharge for each diver, the personal
// instructor once. Not discounted by a bono, and paid by the customer even
// when a partner pays the activity.
export function addOnLines(
  booking: { addOns: BookingAddOn[]; participantCount: number; transferPickup?: string | null },
  prices: PriceList,
): InvoiceItemDto[] {
  return booking.addOns.map((addOn) => {
    const quantity = PER_DIVER_ADD_ONS.includes(addOn) ? booking.participantCount : 1;
    const unitPrice = prices.addOns[addOn];
    // A transfer says where from, when known.
    const pickup = addOn === 'TRANSFER' && booking.transferPickup ? ` (pickup: ${booking.transferPickup})` : '';
    return {
      description: ADD_ON_NAMES[addOn] + pickup,
      quantity,
      unitPrice,
      total: new D(unitPrice).times(quantity).toNumber(),
      type: 'addon',
    };
  });
}

// Equipment from a guest booking's notes: {"selectedEquipment": ["wetsuit:M", ...]}.
// Staff-written notes are plain text and carry no equipment. One set per
// booking, as the booking form collects it.
export function equipmentLines(notes: string | null, prices: PriceList): InvoiceItemDto[] {
  let selected: string[] = [];
  try {
    const parsed = notes ? (JSON.parse(notes) as { selectedEquipment?: unknown }) : null;
    if (Array.isArray(parsed?.selectedEquipment)) {
      selected = parsed.selectedEquipment.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    return [];
  }
  const keys = Object.keys(EQUIPMENT_ITEMS) as EquipmentKey[];
  const byNoteKey = new Map<string, EquipmentKey>(keys.map((k) => [EQUIPMENT_ITEMS[k].noteKey, k]));
  const chosen = new Map<EquipmentKey, string | undefined>();
  for (const entry of selected) {
    const [noteKey, size] = entry.split(':');
    const key = byNoteKey.get(noteKey);
    if (key) chosen.set(key, size);
  }
  if (keys.every((k) => chosen.has(k))) {
    const sizes = keys
      .filter((k) => chosen.get(k))
      .map((k) => `${EQUIPMENT_ITEMS[k].name} ${chosen.get(k)}`)
      .join(', ');
    return [
      {
        description: `Full equipment package${sizes ? ` (${sizes})` : ''}`,
        quantity: 1,
        unitPrice: prices.fullPackage,
        total: prices.fullPackage,
        type: 'equipment',
      },
    ];
  }
  return keys
    .filter((k) => chosen.has(k))
    .map((k) => {
      const size = chosen.get(k);
      const { name } = EQUIPMENT_ITEMS[k];
      const price = prices.equipment[k];
      return {
        description: size ? `${name} (${size})` : name,
        quantity: 1,
        unitPrice: price,
        total: price,
        type: 'equipment',
      };
    });
}


// --- Locked prices ---

export interface LockedPrices {
  pricePerDiver: Decimal | null;
  equipmentPrice: Decimal | null;
  addOnPrices: Prisma.JsonValue | null;
  funDiveTiers: Prisma.JsonValue | null;
}

// The prices to record on a booking now, from the current price list: its
// activity's price, its equipment set as booked, every add-on's unit price,
// and the fun dive volume rates.
export function lockPrices(prices: PriceList, booking: { activityType: ActivityType; notes: string | null }) {
  const activity = prices.activities[booking.activityType];
  return {
    pricePerDiver: activity === null ? null : new D(activity),
    equipmentPrice: sumLines(equipmentLines(booking.notes, prices)),
    addOnPrices: { ...prices.addOns } as Prisma.InputJsonValue,
    funDiveTiers: prices.funDiveTiers.map((t) => ({ ...t })) as unknown as Prisma.InputJsonValue,
  };
}

// The equipment set as the notes describe it ("wetsuit:M", …), to tell
// whether an edit changed what is hired.
export function equipmentSelection(notes: string | null) {
  return equipmentLines(notes, ZERO_PRICES)
    .map((l) => l.description)
    .sort()
    .join('|');
}

// The price list as it applies to one booking: its locked add-on prices
// over the current ones.
export function pricesFor(prices: PriceList, booking: Partial<LockedPrices>): PriceList {
  const locked = addOnMap(booking.addOnPrices ?? null);
  return locked ? { ...prices, addOns: { ...prices.addOns, ...locked } } : prices;
}

// The booking's activity price per diver: locked, else the current one
// (null: no price set).
export function bookingUnitPrice(prices: PriceList, booking: { activityType: ActivityType } & Partial<LockedPrices>) {
  if (booking.pricePerDiver !== null && booking.pricePerDiver !== undefined) return new D(booking.pricePerDiver).toNumber();
  return prices.activities[booking.activityType];
}

// The booking's equipment lines. When its locked price differs from what the
// set costs now, one line at the locked price replaces the item lines.
export function bookingEquipmentLines(
  prices: PriceList,
  booking: { notes: string | null } & Partial<LockedPrices>,
): InvoiceItemDto[] {
  const lines = equipmentLines(booking.notes, prices);
  const locked = booking.equipmentPrice;
  if (locked === null || locked === undefined || lines.length === 0) return lines;
  const total = new D(locked);
  if (total.equals(sumLines(lines))) return lines;
  return [
    {
      description: `Equipment: ${lines.map((l) => l.description).join(', ')}`,
      quantity: 1,
      unitPrice: total.toNumber(),
      total: total.toNumber(),
      type: 'equipment',
    },
  ];
}

// The volume rates locked on a booking, if any.
export function lockedTiers(booking: Partial<LockedPrices>): FunDiveTier[] | null {
  const raw = booking.funDiveTiers;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const tiers = raw
    .map((t) => t as Record<string, unknown>)
    .filter((t) => ['minDives', 'tourist', 'local', 'recurrent'].every((k) => typeof t[k] === 'number'))
    .map((t) => ({ minDives: t.minDives as number, tourist: t.tourist as number, local: t.local as number, recurrent: t.recurrent as number }))
    .sort((a, b) => a.minDives - b.minDives);
  return tiers.length > 0 ? tiers : null;
}

function addOnMap(raw: Prisma.JsonValue | null): Partial<Record<BookingAddOn, number>> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Partial<Record<BookingAddOn, number>> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'number') out[k as BookingAddOn] = v;
  return out;
}

export function sumLines(lines: { total: number }[]) {
  return lines.reduce<Decimal>((acc, l) => acc.plus(l.total), new D(0));
}

// Item names only (equipmentSelection).
const ZERO_PRICES = {
  equipment: Object.fromEntries(Object.keys(EQUIPMENT_ITEMS).map((k) => [k, 0])),
  fullPackage: 0,
} as unknown as PriceList;

// What an edit re-prices: a new activity takes today's price, a different
// equipment set today's price for it; the rest keeps the prices locked when
// the booking was made. A booking from before prices were locked stays
// unlocked (it uses the current list).
export function relockedPrices(
  current: { activityType: ActivityType; notes: string | null; pricePerDiver: unknown },
  next: { activityType: ActivityType; notes: string | null },
  now: ReturnType<typeof lockPrices>,
): { pricePerDiver?: Prisma.Decimal | null; equipmentPrice?: Prisma.Decimal } {
  if (current.pricePerDiver === null) return {};
  return {
    ...(next.activityType !== current.activityType && { pricePerDiver: now.pricePerDiver }),
    ...(equipmentSelection(next.notes) !== equipmentSelection(current.notes) && { equipmentPrice: now.equipmentPrice }),
  };
}
