import { describe, expect, it } from 'vitest';
import { stayDivePrice } from '../config/catalogue.js';
import { SEEDED_PRICES } from '../config/catalogue.fixture.js';
import { ActivityType, BookingSource, CustomerType } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { packOffer, priceStay } from './stays.service.js';

const customer = (customerType: CustomerType) => ({
  id: 'c1',
  firstName: 'Ana',
  lastName: 'Diaz',
  insuranceExpiry: null,
  insuranceIssuedAt: null,
  insuranceValidDays: null,
  waiverSignedAt: null,
  customerType,
  user: { email: 'ana@example.com' },
});

let n = 0;
function booking(activityType: ActivityType, extra: Record<string, unknown> = {}) {
  n += 1;
  return {
    id: `b${n}`,
    customerId: 'c1',
    date: new Date('2026-10-01T00:00:00Z'),
    timeSlot: 'MORNING',
    activityType,
    participantCount: 1,
    numberOfDives: 1,
    bonoId: null,
    bono: null,
    addOns: [],
    shoreTime: null,
    locationId: null,
    plannedStayDays: null,
    transferPickup: null,
    pricePerDiver: null,
    equipmentPrice: null,
    addOnPrices: null,
    funDiveTiers: null,
    status: 'CONFIRMED',
    bookingSource: BookingSource.DIRECT,
    notes: null,
    stayId: null,
    partnerId: null,
    partner: null,
    boat: { name: 'White Magic' },
    ...extra,
  } as Parameters<typeof priceStay>[1][number];
}

const funDives = (count: number, extra?: Record<string, unknown>) =>
  Array.from({ length: count }, () => booking(ActivityType.FUN_DIVE, extra));

describe('stayDivePrice', () => {
  it.each([
    [0, 46],
    [2, 46],
    [3, 44],
    [5, 44],
    [6, 42],
    [8, 42],
    [9, 40],
    [12, 40],
    [13, 38],
    [30, 38],
  ])('tourists pay the tier for %i dives: %i', (dives, price) => {
    expect(stayDivePrice(SEEDED_PRICES, CustomerType.TOURIST, dives)).toBe(price);
  });

  it('reads the rates from the price list, by customer type', () => {
    const prices = {
      ...SEEDED_PRICES,
      funDiveTiers: [
        { minDives: 1, tourist: 50, local: 40, recurrent: 36 },
        { minDives: 5, tourist: 45, local: 38, recurrent: 34 },
      ],
    };
    expect(stayDivePrice(prices, CustomerType.TOURIST, 4)).toBe(50);
    expect(stayDivePrice(prices, CustomerType.TOURIST, 5)).toBe(45);
    expect(stayDivePrice(prices, CustomerType.LOCAL, 5)).toBe(38);
    expect(stayDivePrice(prices, CustomerType.RECURRENT, 1)).toBe(36);
  });

  it('gives locals and recurrent customers a flat rate', () => {
    expect(stayDivePrice(SEEDED_PRICES, CustomerType.LOCAL, 1)).toBe(35);
    expect(stayDivePrice(SEEDED_PRICES, CustomerType.LOCAL, 20)).toBe(35);
    expect(stayDivePrice(SEEDED_PRICES, CustomerType.RECURRENT, 20)).toBe(32);
  });
});

describe('priceStay', () => {
  it('prices every fun dive at the rate for the whole stay', () => {
    const priced = priceStay(customer(CustomerType.TOURIST), funDives(6), [], SEEDED_PRICES);
    expect(priced.totalDives).toBe(6);
    expect(priced.pricePerDive).toBe(42);
    expect(priced.bookingsTotal.toFixed(2)).toBe('252.00');
  });

  it('counts a booking once toward the volume but charges each diver', () => {
    const priced = priceStay(customer(CustomerType.TOURIST), funDives(3, { participantCount: 2 }), [], SEEDED_PRICES);
    expect(priced.totalDives).toBe(3);
    expect(priced.bookingsTotal.toFixed(2)).toBe('264.00'); // 3 × 2 × 44
  });

  it('adds up the dives of each fun dive booking toward the volume, and charges each one', () => {
    // 2 bookings of 3 dives and 1 of 1: 7 dives, the 6-dive tier (42).
    const bookings = [...funDives(2, { numberOfDives: 3 }), ...funDives(1)];
    const priced = priceStay(customer(CustomerType.TOURIST), bookings, [], SEEDED_PRICES);
    expect(priced.totalDives).toBe(7);
    expect(priced.pricePerDive).toBe(42);
    expect(priced.bookingsTotal.toFixed(2)).toBe('294.00'); // 7 × 42
  });

  it('prices a course per person whatever its number of dives', () => {
    const priced = priceStay(
      customer(CustomerType.TOURIST),
      [booking(ActivityType.OW_CERT, { numberOfDives: 4 })],
      [],
      SEEDED_PRICES,
    );
    expect(priced.totalDives).toBe(0);
    expect(priced.bookingsTotal.toFixed(2)).toBe('350.00');
  });

  it('charges other activities at catalogue price, outside the volume', () => {
    const priced = priceStay(
      customer(CustomerType.TOURIST),
      [...funDives(2), booking(ActivityType.SNORKELING), booking(ActivityType.DISCOVER_SCUBA)],
      [],
      SEEDED_PRICES,
    );
    expect(priced.totalDives).toBe(2);
    expect(priced.bookingsTotal.toFixed(2)).toBe(String((2 * 46 + 25 + 60).toFixed(2)));
  });

  it('leaves partner activities to the partner but counts their dives', () => {
    const priced = priceStay(
      customer(CustomerType.TOURIST),
      [...funDives(2), ...funDives(1, { bookingSource: BookingSource.PARTNER })],
      [],
      SEEDED_PRICES,
    );
    expect(priced.totalDives).toBe(3);
    expect(priced.bookingsTotal.toFixed(2)).toBe('88.00'); // 2 × 44
  });

  it('adds booked equipment and extra costs', () => {
    const notes = JSON.stringify({ selectedEquipment: ['wetsuit:M', 'regulator'] });
    const priced = priceStay(customer(CustomerType.LOCAL), funDives(1, { notes }), [
      { total: '12.50' } as never,
    ], SEEDED_PRICES);
    expect(priced.bookingsTotal.toFixed(2)).toBe('53.00'); // 35 + 8 + 10
    expect(priced.costsTotal.toFixed(2)).toBe('12.50');
  });

  it('maps the booking form\'s computer to the dive computer price, and prices the full package', () => {
    const one = JSON.stringify({ selectedEquipment: ['computer'] });
    const all = JSON.stringify({ selectedEquipment: ['wetsuit:M', 'bcd:L', 'regulator', 'maskFins:42', 'computer'] });
    const prices = { ...SEEDED_PRICES, equipment: { ...SEEDED_PRICES.equipment, diveComputer: 15 }, fullPackage: 30 };
    expect(priceStay(customer(CustomerType.LOCAL), funDives(1, { notes: one }), [], prices).bookingsTotal.toFixed(2)).toBe('50.00');
    expect(priceStay(customer(CustomerType.LOCAL), funDives(1, { notes: all }), [], prices).bookingsTotal.toFixed(2)).toBe('65.00');
  });

  it('reports activities with no price', () => {
    const priced = priceStay(customer(CustomerType.TOURIST), [booking(ActivityType.DM_CERT)], [], SEEDED_PRICES);
    expect(priced.unpriced).toEqual(['Divemaster Course']);
  });

  it('takes a government bono off its booking\'s activity only, not equipment or partner activities', () => {
    const pct = { code: 'GOV20', type: 'PERCENTAGE', discountValue: '20' };
    const fixed = { code: 'GOV50', type: 'FIXED', discountValue: '50' };
    const hire = JSON.stringify({ selectedEquipment: ['regulator'] });
    const priced = priceStay(
      customer(CustomerType.TOURIST),
      [
        booking(ActivityType.FUN_DIVE, { numberOfDives: 2, bonoId: 'p', bono: pct, notes: hire }), // 4 dives in the stay: 44 each; 2 × 44 = 88 → 17.60
        booking(ActivityType.FUN_DIVE, { bonoId: 'f', bono: fixed }), // 44, of 50 off → 44
        booking(ActivityType.FUN_DIVE, { bonoId: 'f', bono: fixed, partnerId: 'x', bookingSource: BookingSource.PARTNER }),
      ],
      [],
      SEEDED_PRICES,
    );
    expect(priced.lines.map((l) => l.discount.toFixed(2))).toEqual(['17.60', '44.00', '0.00']);
    expect(priced.lines[2].bono).toBeNull();
    expect(priced.discount.toFixed(2)).toBe('61.60');
  });

  it('adds the night dive surcharge per diver and the personal instructor once, outside the bono', () => {
    const bono = { code: 'B', type: 'PERCENTAGE', discountValue: '50' };
    const priced = priceStay(
      customer(CustomerType.LOCAL),
      [booking(ActivityType.FUN_DIVE, { participantCount: 2, addOns: ['NIGHT_DIVE', 'PERSONAL_INSTRUCTOR'], bonoId: 'b', bono })],
      [],
      SEEDED_PRICES,
    );
    // 2 divers × 35 = 70; night 2 × 20 = 40; instructor 100.
    expect(priced.lines[0].addOns.map((a) => [a.description, a.quantity, a.total])).toEqual([
      ['Night dive surcharge', 2, 40],
      ['Personal instructor', 1, 100],
    ]);
    expect(priced.bookingsTotal.toFixed(2)).toBe('210.00');
    expect(priced.discount.toFixed(2)).toBe('35.00'); // half of the activity only
  });
});

describe('dive packs', () => {
  const fives = (n: number, extra?: Record<string, unknown>) =>
    Array.from({ length: n }, () => booking(ActivityType.FUN_DIVE, extra));

  it('are offered when the customer\'s own fun dives come to a pack exactly', () => {
    expect(packOffer(fives(5), SEEDED_PRICES)).toMatchObject({ diveCount: 5, price: 200, divers: 1 });
    expect(packOffer(fives(4), SEEDED_PRICES)).toBeNull();
    // Dives per diver: 2 bookings of 5 dives for two divers = the 10-dive pack, twice.
    const pair = packOffer(fives(2, { numberOfDives: 5, participantCount: 2 }), SEEDED_PRICES);
    expect(pair).toMatchObject({ diveCount: 10, divers: 2 });
    expect(pair!.total.toFixed(2)).toBe('760.00');
    // Different numbers of divers: no pack.
    expect(packOffer([...fives(4), booking(ActivityType.FUN_DIVE, { participantCount: 2 })], SEEDED_PRICES)).toBeNull();
    // Partner dives are not the customer's to pay, so they do not count.
    expect(packOffer([...fives(5), booking(ActivityType.FUN_DIVE, { partnerId: 'p' })], SEEDED_PRICES)).not.toBeNull();
  });

  it('replace the stay rate of the dives they cover, shared out by dives; extras stay', () => {
    const stay = [
      booking(ActivityType.FUN_DIVE, { numberOfDives: 2 }),
      booking(ActivityType.FUN_DIVE, { numberOfDives: 1, addOns: ['NIGHT_DIVE'] }),
      booking(ActivityType.SNORKELING),
    ];
    const atRate = priceStay(customer(CustomerType.TOURIST), [...stay, booking(ActivityType.FUN_DIVE, { numberOfDives: 2 })], [], SEEDED_PRICES);
    expect(atRate.pack).toMatchObject({ diveCount: 5, price: 200 });
    const priced = priceStay(customer(CustomerType.TOURIST), [...stay, booking(ActivityType.FUN_DIVE, { numberOfDives: 2 })], [], SEEDED_PRICES, true);
    expect(priced.lines.map((l) => l.activityTotal.toFixed(2))).toEqual(['80.00', '40.00', '25.00', '80.00']);
    expect(priced.lines.map((l) => l.inPack)).toEqual([true, true, false, true]);
    expect(priced.bookingsTotal.toFixed(2)).toBe('245.00'); // 200 + snorkeling 25 + night 20
    expect(() => priceStay(customer(CustomerType.TOURIST), stay, [], SEEDED_PRICES, true)).toThrow(/No dive pack/);
  });

  it('share an uneven price exactly', () => {
    const prices = { ...SEEDED_PRICES, divePacks: [{ diveCount: 3, price: 100 }] };
    const priced = priceStay(customer(CustomerType.TOURIST), fives(3), [], prices, true);
    expect(priced.lines.map((l) => l.activityTotal.toFixed(2))).toEqual(['33.33', '33.33', '33.34']);
  });
});

describe('prices locked at booking time', () => {
  // December's price list; January's raises everything.
  const DEC = SEEDED_PRICES;
  const JAN = {
    ...SEEDED_PRICES,
    activities: { ...SEEDED_PRICES.activities, SNORKELING: 30 },
    equipment: { ...SEEDED_PRICES.equipment, regulator: 14 },
    addOns: { NIGHT_DIVE: 25, PERSONAL_INSTRUCTOR: 120, TRANSFER: 15 },
    funDiveTiers: SEEDED_PRICES.funDiveTiers.map((t) => ({ ...t, tourist: t.tourist + 4 })),
  };
  const lockedAt = (prices: typeof DEC, extra: Record<string, unknown>) => ({
    pricePerDiver: new Prisma.Decimal(prices.activities[(extra.activityType as ActivityType) ?? ActivityType.FUN_DIVE] ?? 0),
    equipmentPrice: new Prisma.Decimal(extra.equipmentTotal as number ?? 0),
    addOnPrices: { ...prices.addOns },
    funDiveTiers: prices.funDiveTiers,
  });
  const hire = JSON.stringify({ selectedEquipment: ['regulator'] });

  it('bills each booking at its own prices; fun dives at their own rates, at the tier of the whole stay', () => {
    const dec = booking(ActivityType.FUN_DIVE, { date: new Date('2026-12-28T00:00:00Z'), numberOfDives: 2, notes: hire, addOns: ['NIGHT_DIVE'], ...lockedAt(DEC, { equipmentTotal: 10 }) });
    const decSnorkel = booking(ActivityType.SNORKELING, { date: new Date('2026-12-29T00:00:00Z'), ...lockedAt(DEC, { activityType: ActivityType.SNORKELING }) });
    const jan = booking(ActivityType.FUN_DIVE, { date: new Date('2027-01-03T00:00:00Z'), numberOfDives: 2, notes: hire, addOns: ['NIGHT_DIVE'], ...lockedAt(JAN, { equipmentTotal: 14 }) });
    const janSnorkel = booking(ActivityType.SNORKELING, { date: new Date('2027-01-04T00:00:00Z'), ...lockedAt(JAN, { activityType: ActivityType.SNORKELING }) });
    // Billed in January, with January's list current.
    const priced = priceStay(customer(CustomerType.TOURIST), [jan, janSnorkel, dec, decSnorkel], [], JAN);
    // 4 fun dives in the stay: the 3+ tier for both, December's at 44,
    // January's at 48.
    expect(priced.pricePerDive).toBe(44); // the earliest fun dive booking's
    expect(priced.funDiveRates).toEqual([44, 48]);
    const byId = new Map(priced.lines.map((l) => [l.booking.id, l]));
    expect(byId.get(decSnorkel.id)!.activityTotal.toFixed(2)).toBe('25.00'); // December price
    expect(byId.get(janSnorkel.id)!.activityTotal.toFixed(2)).toBe('30.00'); // January price
    expect(byId.get(dec.id)!.equipment.map((e) => e.total)).toEqual([10]);
    expect(byId.get(jan.id)!.equipment.map((e) => e.total)).toEqual([14]);
    expect(byId.get(dec.id)!.addOns.map((a) => a.total)).toEqual([20]);
    expect(byId.get(jan.id)!.addOns.map((a) => a.total)).toEqual([25]);
    expect(byId.get(dec.id)!.activityTotal.toFixed(2)).toBe('88.00');
    expect(byId.get(jan.id)!.activityTotal.toFixed(2)).toBe('96.00');
    // Fun dives 2 × 44 + 2 × 48, snorkeling 25 + 30, equipment 10 + 14, night 20 + 25.
    expect(priced.bookingsTotal.toFixed(2)).toBe('308.00');
    expect(priced.priceChanges).toEqual(
      expect.arrayContaining([
        { kind: 'stayRate', locked: 44, current: 48 },
        { kind: 'activity', activityType: 'SNORKELING', locked: 25, current: 30 },
        { kind: 'equipment', bookings: 1 },
        { kind: 'addOn', addOn: 'NIGHT_DIVE', locked: 20, current: 25 },
      ]),
    );
  });

  it('uses the current price list for bookings from before prices were locked, and reports no change', () => {
    const old = booking(ActivityType.SNORKELING);
    const priced = priceStay(customer(CustomerType.TOURIST), [old, ...funDives(2)], [], JAN);
    expect(priced.lines[0].activityTotal.toFixed(2)).toBe('30.00');
    expect(priced.pricePerDive).toBe(50); // January's 1-2 dive tier
    expect(priced.priceChanges).toEqual([]);
  });

  it('shows a locked equipment price that differs from today\'s as one line', () => {
    const b = booking(ActivityType.FUN_DIVE, { notes: JSON.stringify({ selectedEquipment: ['regulator', 'bcd:L'] }), ...lockedAt(DEC, { equipmentTotal: 20 }) });
    const lines = priceStay(customer(CustomerType.TOURIST), [b], [], JAN).lines[0].equipment;
    expect(lines).toEqual([{ description: 'Equipment: BCD (L), Regulator', quantity: 1, unitPrice: 20, total: 20, type: 'equipment' }]);
    // Unchanged prices keep the item lines.
    expect(priceStay(customer(CustomerType.TOURIST), [b], [], DEC).lines[0].equipment).toHaveLength(2);
  });

  it('counts every dive of the stay toward the tier, across a price change (5 + 9 = 14 dives)', () => {
    // 2026: 13+ dives at 38 (the seeded list). 2027: 13+ dives at 40.
    const y2026 = SEEDED_PRICES;
    const y2027 = {
      ...SEEDED_PRICES,
      funDiveTiers: SEEDED_PRICES.funDiveTiers.map((t) => (t.minDives === 13 ? { ...t, tourist: 40 } : { ...t, tourist: t.tourist + 2 })),
    };
    const lockedTo = (p: typeof y2026) => ({ funDiveTiers: p.funDiveTiers, pricePerDiver: new Prisma.Decimal(45), addOnPrices: { ...p.addOns } });
    const stay = [
      ...Array.from({ length: 5 }, (_, i) => booking(ActivityType.FUN_DIVE, { date: new Date(`2026-12-${27 + i}T00:00:00Z`), ...lockedTo(y2026) })),
      booking(ActivityType.FUN_DIVE, { date: new Date('2027-01-02T00:00:00Z'), numberOfDives: 4, ...lockedTo(y2027) }),
      booking(ActivityType.FUN_DIVE, { date: new Date('2027-01-03T00:00:00Z'), numberOfDives: 5, ...lockedTo(y2027) }),
    ];
    const priced = priceStay(customer(CustomerType.TOURIST), stay, [], y2027);
    expect(priced.totalDives).toBe(14);
    expect(priced.lines.map((l) => l.unit)).toEqual([38, 38, 38, 38, 38, 40, 40]);
    // 5 × 38 + 9 × 40 = 190 + 360.
    expect(priced.bookingsTotal.toFixed(2)).toBe('550.00');
    expect(priced.funDiveRates).toEqual([38, 40]);
    expect(priced.priceChanges).toEqual([{ kind: 'stayRate', locked: 38, current: 40 }]);
  });
});

