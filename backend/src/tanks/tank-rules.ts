// When a tank's tests fall due. The tank records the date each test was last
// done; the next is due a fixed interval later. Intervals for scuba
// cylinders: a visual inspection every year, a hydrostatic test every five
// years. Check them against the rules where the center operates.

export const TANK_SIZES = ['10L', '12L', '15L', 'Nitrox12L', 'Nitrox15L'] as const;
export type TankSize = (typeof TANK_SIZES)[number];

export const VISUAL_INTERVAL_MONTHS = 12;
export const HYDROSTATIC_INTERVAL_MONTHS = 60;
// "Due soon": within this many days.
export const DUE_SOON_DAYS = 30;

export type TestState = 'OK' | 'DUE_SOON' | 'OVERDUE' | 'NO_RECORD';

export function addMonths(isoDate: string, months: number) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  // The same day of the month, or the month's last day (31 Jan → 28 Feb).
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A test's next due date and state on `today` (the center's date). No date
// on record counts as not tested.
export function testDue(last: Date | null, months: number, today: string) {
  if (!last) return { due: null, state: 'NO_RECORD' as TestState };
  const due = addMonths(last.toISOString().slice(0, 10), months);
  const state: TestState = due < today ? 'OVERDUE' : due <= addDays(today, DUE_SOON_DAYS) ? 'DUE_SOON' : 'OK';
  return { due, state };
}

// Sizes as people write them: "12", "12 l", "nitrox 15", "EAN 12L".
export function tankSize(value: string): TankSize | undefined {
  const v = value.toLowerCase().replace(/\s|litres?|liters?|ltrs?/g, '');
  const nitrox = /nitrox|ean|nx/.test(v);
  const litres = v.match(/(\d+)/)?.[1];
  const size = `${nitrox ? 'Nitrox' : ''}${litres}L`;
  return (TANK_SIZES as readonly string[]).includes(size) ? (size as TankSize) : undefined;
}
