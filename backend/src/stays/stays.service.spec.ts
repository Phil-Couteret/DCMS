import { describe, expect, it } from 'vitest';
import { stayDivePrice } from '../config/prices.js';
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
    status: 'CONFIRMED',
    bookingSource: BookingSource.DIRECT,
    notes: null,
    stayId: null,
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
    expect(stayDivePrice(CustomerType.TOURIST, dives)).toBe(price);
  });

  it('gives locals and recurrent customers a flat rate', () => {
    expect(stayDivePrice(CustomerType.LOCAL, 1)).toBe(35);
    expect(stayDivePrice(CustomerType.LOCAL, 20)).toBe(35);
    expect(stayDivePrice(CustomerType.RECURRENT, 20)).toBe(32);
  });
});

describe('priceStay', () => {
  it('prices every fun dive at the rate for the whole stay', () => {
    const priced = priceStay(customer(CustomerType.TOURIST), funDives(6), []);
    expect(priced.totalDives).toBe(6);
    expect(priced.pricePerDive).toBe(42);
    expect(priced.bookingsTotal.toFixed(2)).toBe('252.00');
  });

  it('counts a booking once toward the volume but charges each diver', () => {
    const priced = priceStay(customer(CustomerType.TOURIST), funDives(3, { participantCount: 2 }), []);
    expect(priced.totalDives).toBe(3);
    expect(priced.bookingsTotal.toFixed(2)).toBe('264.00'); // 3 × 2 × 44
  });

  it('charges other activities at catalogue price, outside the volume', () => {
    const priced = priceStay(
      customer(CustomerType.TOURIST),
      [...funDives(2), booking(ActivityType.SNORKELING), booking(ActivityType.DISCOVER_SCUBA)],
      [],
    );
    expect(priced.totalDives).toBe(2);
    expect(priced.bookingsTotal.toFixed(2)).toBe(String((2 * 46 + 25 + 60).toFixed(2)));
  });

  it('leaves partner activities to the partner but counts their dives', () => {
    const priced = priceStay(
      customer(CustomerType.TOURIST),
      [...funDives(2), ...funDives(1, { bookingSource: BookingSource.PARTNER })],
      [],
    );
    expect(priced.totalDives).toBe(3);
    expect(priced.bookingsTotal.toFixed(2)).toBe('88.00'); // 2 × 44
  });

  it('adds booked equipment and extra costs', () => {
    const notes = JSON.stringify({ selectedEquipment: ['wetsuit:M', 'regulator'] });
    const priced = priceStay(customer(CustomerType.LOCAL), funDives(1, { notes }), [
      { total: '12.50' } as never,
    ]);
    expect(priced.bookingsTotal.toFixed(2)).toBe('53.00'); // 35 + 8 + 10
    expect(priced.costsTotal.toFixed(2)).toBe('12.50');
  });

  it('reports activities with no price', () => {
    const priced = priceStay(customer(CustomerType.TOURIST), [booking(ActivityType.DM_CERT)], []);
    expect(priced.unpriced).toEqual(['Divemaster Course']);
  });
});
