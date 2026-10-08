// Each center runs on its own time zone (Settings → General; centerLocale()
// on the server, a prop in client components), whatever timezone the server
// or the browser is in. "Today", the greeting, the trip alerts and every
// wall-clock time staff enter or read use it.

// Minutes after midnight, center time. Night dives start at 18:00, as in the
// previous frontend's schedule.
export const SLOT_START = { MORNING: 8 * 60, AFTERNOON: 14 * 60, NIGHT: 18 * 60 } as const;
export type SlotKey = keyof typeof SLOT_START;

const ALERT_WINDOW_MINUTES = 60;

export interface CenterNow {
  isoDate: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  day: number;
  minutes: number; // minutes after midnight
}

export function centerNow(timeZone: string, now = new Date()): CenterNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 18 * 60) return "Good afternoon";
  return "Good evening";
}

// A PENDING booking is flagged from one hour before its slot starts, and stays
// flagged after the start: an unchecked booking on a trip that has left is
// more urgent, not less. Returns minutes until the start (negative once
// started), or null when no alert is due.
export function pendingAlert(status: string, slot: SlotKey, nowMinutes: number) {
  if (status !== "PENDING") return null;
  const untilStart = SLOT_START[slot] - nowMinutes;
  return untilStart <= ALERT_WINDOW_MINUTES ? untilStart : null;
}

function offsetMinutes(at: Date, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((asUtc - at.getTime()) / 60000);
}

// A wall-clock date and time at the center ("2026-07-01", "09:30") as a UTC
// instant. Checked twice so the offset is the one in force at that moment,
// summer or winter.
export function centerLocalToUtc(timeZone: string, date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60000);
}

// "09:30" for an instant, in center time.
export function centerClock(timeZone: string, iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

// "2026-07-01T09:30" for an instant, in center time: the value of a
// datetime-local input. centerLocalToUtc turns it back.
export function centerDateTimeInput(timeZone: string, iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// "8 Oct 2026, 09:30" for an instant, in center time.
export function centerDateTime(timeZone: string, iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

// A short label for the time zone, e.g. "Atlantic/Canary" → "Canary".
export function zoneLabel(timeZone: string) {
  return timeZone.split("/").pop()!.replace(/_/g, " ");
}
