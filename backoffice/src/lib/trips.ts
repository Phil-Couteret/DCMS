import type { TimeSlot, TripRole, TripStatus } from "@/lib/api";

export const TRIP_SLOTS: TimeSlot[] = ["MORNING", "AFTERNOON", "NIGHT"];
export const TRIP_ROLES: TripRole[] = ["CAPTAIN", "GUIDE", "TRAINEE_GUIDE"];
export const TRIP_STATUSES: TripStatus[] = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"];

export const SLOT_NAMES: Record<TimeSlot, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  NIGHT: "Night",
};

// Pills and card accents: blue morning, orange afternoon, purple night.
export const SLOT_PILL: Record<TimeSlot, string> = {
  MORNING: "bg-blue-600 text-white hover:bg-blue-700",
  AFTERNOON: "bg-orange-500 text-white hover:bg-orange-600",
  NIGHT: "bg-purple-600 text-white hover:bg-purple-700",
};

export const SLOT_DOT: Record<TimeSlot, string> = {
  MORNING: "bg-blue-600",
  AFTERNOON: "bg-orange-500",
  NIGHT: "bg-purple-600",
};

export const SLOT_ACCENT: Record<TimeSlot, string> = {
  MORNING: "border-l-blue-600",
  AFTERNOON: "border-l-orange-500",
  NIGHT: "border-l-purple-600",
};

export const ROLE_LABELS: Record<TripRole, string> = {
  CAPTAIN: "Captain",
  GUIDE: "Guide",
  TRAINEE_GUIDE: "Trainee guide",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TRIP_STATUS_STYLES: Record<TripStatus, string> = {
  PLANNED: "bg-zinc-100 text-zinc-800",
  ACTIVE: "bg-green-100 text-green-900",
  COMPLETED: "bg-blue-100 text-blue-900",
  CANCELLED: "bg-red-100 text-red-900 line-through",
};

// The only moves the backoffice offers. The API itself accepts any status.
export const TRIP_TRANSITIONS: Record<TripStatus, { to: TripStatus; label: string }[]> = {
  PLANNED: [
    { to: "ACTIVE", label: "Start trip" },
    { to: "CANCELLED", label: "Cancel" },
  ],
  ACTIVE: [
    { to: "COMPLETED", label: "Complete" },
    { to: "CANCELLED", label: "Cancel" },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

// Completed and cancelled trips take no more staff or bookings.
export function isTripOpen(status: TripStatus) {
  return status === "PLANNED" || status === "ACTIVE";
}

export type ScheduleView = "month" | "week" | "day";
export const SCHEDULE_VIEWS: ScheduleView[] = ["month", "week", "day"];

// Calendar days are handled as YYYY-MM-DD strings and computed in UTC, the
// way the API stores them, so the server's timezone never shifts a day.
function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function tripDay(tripDate: string) {
  return tripDate.slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

// Same day number in another month, clamped to that month's length.
export function addMonths(iso: string, months: number) {
  const d = toDate(iso);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return toIso(target);
}

export function monthDays(iso: string) {
  const d = toDate(iso);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const count = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length: count }, (_, i) => addDays(toIso(first), i));
  // Weeks start on Monday: getUTCDay() is 0 for Sunday.
  const leadingBlanks = (first.getUTCDay() + 6) % 7;
  return { days, leadingBlanks };
}

// The range the view shows, both ends inclusive.
export function viewRange(view: ScheduleView, anchor: string) {
  if (view === "day") return { from: anchor, to: anchor };
  if (view === "week") return { from: anchor, to: addDays(anchor, 6) };
  const { days } = monthDays(anchor);
  return { from: days[0], to: days[days.length - 1] };
}

export function shiftAnchor(view: ScheduleView, anchor: string, step: 1 | -1) {
  if (view === "day") return addDays(anchor, step);
  if (view === "week") return addDays(anchor, 7 * step);
  return addMonths(anchor, step);
}

export function formatDayLabel(iso: string, style: "long" | "short" | "weekday" | "month") {
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : style === "weekday"
        ? { weekday: "short", day: "numeric" }
        : style === "month"
          ? { month: "long", year: "numeric" }
          : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(toDate(iso));
}

export function rangeLabel(view: ScheduleView, anchor: string) {
  if (view === "month") return formatDayLabel(anchor, "month");
  if (view === "day") return formatDayLabel(anchor, "long");
  const { to } = viewRange(view, anchor);
  return `${formatDayLabel(anchor, "short")} – ${formatDayLabel(to, "short")} ${to.slice(0, 4)}`;
}

export interface ScheduleQuery {
  view: ScheduleView;
  date: string;
  day?: string;
  trip?: string;
  new?: string; // the day the create form opens on
  location?: string; // only this location's trips, boats and sites
}

// Every panel lives in the URL so the server renders it and Back closes it.
export function scheduleHref(q: ScheduleQuery) {
  const params = new URLSearchParams({ view: q.view, date: q.date });
  if (q.day) params.set("day", q.day);
  if (q.trip) params.set("trip", q.trip);
  if (q.new) params.set("new", q.new);
  if (q.location) params.set("location", q.location);
  return `/dashboard/schedule?${params}`;
}

// Shore trips (beach, harbour, pool; no boat): an hour-long session starts
// every 30 minutes, as the API's SHORE_START_TIMES, plus 10:15 in the morning
// (the usual time for shore discovery dives).
function shoreStarts(from: string, last: string) {
  const out: string[] = [];
  const toMin = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  for (let m = toMin(from); m <= toMin(last); m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

export const SHORE_START_TIMES: Record<TimeSlot, string[]> = {
  MORNING: [...shoreStarts("09:30", "12:00"), "10:15"].sort(),
  AFTERNOON: shoreStarts("14:00", "17:00"),
  NIGHT: shoreStarts("19:00", "20:30"),
};

// "10:00–11:00"
export function shoreSession(start: string) {
  const m = Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + 60;
  return `${start}–${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// Activities that take place on shore unless staff choose a boat.
export const SHORE_ACTIVITIES = ["DISCOVER_SCUBA", "OW_CERT"];

// What a trip is called: its boat, or "Shore 10:00–11:00" (t: a translator,
// English when left out).
export function tripPlace(
  trip: { boat?: { name: string } | null; startTime?: string | null },
  t: (text: string, vars?: Record<string, string | number>) => string = (x, v) => (v ? x.replace(/\{(\w+)\}/g, (_, k) => String(v[k])) : x),
) {
  if (trip.boat) return trip.boat.name;
  return trip.startTime ? t("Shore {time}", { time: shoreSession(trip.startTime) }) : t("Shore dive");
}

