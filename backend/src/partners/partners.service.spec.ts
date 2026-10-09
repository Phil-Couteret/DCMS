import { describe, expect, it } from 'vitest';
import { SEEDED_PRICES } from '../config/catalogue.fixture.js';
import { Prisma } from '../generated/prisma/client.js';
import { ActivityType } from '../generated/prisma/enums.js';
import { partnerAmounts, valueBooking } from './partners.service.js';

const booking = (activityType: ActivityType, participantCount = 1, numberOfDives = 1) =>
  ({
    id: 'b1',
    date: new Date('2026-10-01T00:00:00Z'),
    timeSlot: 'MORNING',
    activityType,
    participantCount,
    numberOfDives,
    status: 'CONFIRMED',
    customer: { firstName: 'Ana', lastName: 'Diaz' },
  }) as Parameters<typeof valueBooking>[0];

describe('valueBooking', () => {
  it('values a booking at catalogue price for each diver', () => {
    const v = valueBooking(booking(ActivityType.FUN_DIVE, 3), SEEDED_PRICES);
    expect(v.unitPrice?.toFixed(2)).toBe('45.00');
    expect(v.total?.toFixed(2)).toBe('135.00');
  });

  it('has no value for an activity without a price', () => {
    expect(valueBooking(booking(ActivityType.DM_CERT), SEEDED_PRICES).total).toBeNull();
  });
});

describe('partnerAmounts', () => {
  it('takes the commission off, then adds tax on what is due', () => {
    const a = partnerAmounts(new Prisma.Decimal(1000), 15, 7);
    expect(a.commission.toFixed(2)).toBe('150.00');
    expect(a.subtotal.toFixed(2)).toBe('850.00');
    expect(a.tax.toFixed(2)).toBe('59.50');
    expect(a.total.toFixed(2)).toBe('909.50');
  });

  it('rounds each step to cents', () => {
    const a = partnerAmounts(new Prisma.Decimal('133.33'), '12.5', '7');
    expect(a.commission.toFixed(2)).toBe('16.67'); // 16.66625
    expect(a.subtotal.toFixed(2)).toBe('116.66');
    expect(a.tax.toFixed(2)).toBe('8.17'); // 8.1662
    expect(a.total.toFixed(2)).toBe('124.83');
  });

  it('charges the full value with no commission', () => {
    const a = partnerAmounts(new Prisma.Decimal(90), 0, 7);
    expect(a.subtotal.toFixed(2)).toBe('90.00');
    expect(a.total.toFixed(2)).toBe('96.30');
  });
});
