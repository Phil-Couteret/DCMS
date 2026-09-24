// The dive center runs on Canary Islands time, whatever timezone the server
// is in. "Today", the greeting and the trip alerts all use this.
export const CENTER_TIME_ZONE = "Atlantic/Canary";

// Minutes after midnight, center time.
export const SLOT_START = { MORNING: 8 * 60, AFTERNOON: 14 * 60 } as const;
export type SlotKey = keyof typeof SLOT_START;

const ALERT_WINDOW_MINUTES = 60;

export interface CenterNow {
  isoDate: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  day: number;
  minutes: number; // minutes after midnight
}

export function centerNow(now = new Date()): CenterNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: CENTER_TIME_ZONE,
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

function offsetMinutes(at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: CENTER_TIME_ZONE,
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
export function centerLocalToUtc(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - offsetMinutes(new Date(guess)) * 60000;
  return new Date(guess - offsetMinutes(new Date(first)) * 60000);
}

// "09:30" for an instant, in center time.
export function centerClock(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CENTER_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
