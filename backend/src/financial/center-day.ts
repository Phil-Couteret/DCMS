// Each center runs on its own time zone (CenterSettings.timeZone, read with
// TenantConfig), whatever timezone the server is in. A "day" of payments is
// midnight to midnight there.

// Minutes the center's clock is ahead of UTC at an instant.
function offsetMinutes(at: Date, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((asUtc - at.getTime()) / 60000);
}

// Midnight at the center on an ISO date, as a UTC instant. Checked twice so the
// offset is the one in force at that moment, summer or winter.
export function centerMidnight(isoDate: string, timeZone: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60000);
}

// The ISO date n days after another.
export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Today's date at the center.
export function centerToday(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

// The current year at the center: the year of invoice numbers.
export function centerYear(timeZone: string, now = new Date()) {
  return Number(centerToday(timeZone, now).slice(0, 4));
}

// A @db.Date column value for an ISO date.
export function dateOnly(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}

// First day of a quarter and of the next one, as ISO dates.
export function quarterDates(year: number, quarter: number) {
  const month = (quarter - 1) * 3 + 1;
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const next = quarter === 4 ? `${year + 1}-01-01` : `${year}-${String(month + 3).padStart(2, '0')}-01`;
  return { from, next };
}
