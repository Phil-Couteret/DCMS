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
}

// Every panel lives in the URL so the server renders it and Back closes it.
export function scheduleHref(q: ScheduleQuery) {
  const params = new URLSearchParams({ view: q.view, date: q.date });
  if (q.day) params.set("day", q.day);
  if (q.trip) params.set("trip", q.trip);
  if (q.new) params.set("new", q.new);
  return `/dashboard/schedule?${params}`;
}
