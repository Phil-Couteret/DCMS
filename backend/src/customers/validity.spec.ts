import { describe, expect, it } from 'vitest';
import { validUntil } from './validity.js';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('validUntil', () => {
  it('issue date and days: valid through the last of those days', () => {
    expect(validUntil(day('2026-01-01'), 365, null)).toEqual(day('2026-12-31'));
    expect(validUntil(day('2026-03-10'), 1, null)).toEqual(day('2026-03-10'));
  });

  it('wins over the expiry date when both are set', () => {
    expect(validUntil(day('2026-01-01'), 30, day('2027-01-01'))).toEqual(day('2026-01-30'));
  });

  it('otherwise the expiry date, or unknown', () => {
    expect(validUntil(day('2026-01-01'), null, day('2026-06-30'))).toEqual(day('2026-06-30'));
    expect(validUntil(null, 365, day('2026-06-30'))).toEqual(day('2026-06-30'));
    expect(validUntil(null, null, null)).toBeNull();
  });
});
