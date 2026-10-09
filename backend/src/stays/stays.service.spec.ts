import { describe, expect, it } from 'vitest';
import { stayDivePrice } from '../config/catalogue.js';
import { SEEDED_PRICES } from '../config/catalogue.fixture.js';
import { ActivityType, BookingSource, CustomerType } from '../generated/prisma/enums.js';
import { priceStay } from './stays.service.js';

const customer = (customerType: CustomerType) => ({
  id: 'c1',
  firstName: 'Ana',
  lastName: 'Diaz',
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
});
