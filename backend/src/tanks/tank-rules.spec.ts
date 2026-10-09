import { describe, expect, it } from 'vitest';
import { addMonths, tankSize, testDue } from './tank-rules.js';

describe('tank tests', () => {
  it('fall due a whole number of months after the last one', () => {
    expect(addMonths('2025-03-15', 12)).toBe('2026-03-15');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2021-06-30', 60)).toBe('2026-06-30');
  });

  it('are overdue, due within 30 days, fine, or not on record', () => {
    const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
    expect(testDue(d('2025-10-08'), 12, '2026-10-09')).toEqual({ due: '2026-10-08', state: 'OVERDUE' });
    expect(testDue(d('2025-10-09'), 12, '2026-10-09').state).toBe('DUE_SOON');
    expect(testDue(d('2025-11-08'), 12, '2026-10-09').state).toBe('DUE_SOON');
    expect(testDue(d('2025-11-09'), 12, '2026-10-09').state).toBe('OK');
    expect(testDue(null, 12, '2026-10-09')).toEqual({ due: null, state: 'NO_RECORD' });
  });

  it('read sizes as written', () => {
    expect(tankSize('12')).toBe('12L');
    expect(tankSize('15 L')).toBe('15L');
    expect(tankSize('Nitrox 12')).toBe('Nitrox12L');
    expect(tankSize('EAN15L')).toBe('Nitrox15L');
    expect(tankSize('7')).toBeUndefined();
  });
});
