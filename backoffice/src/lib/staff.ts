import type { StaffStatus, StaffType } from "@/lib/api";

export const STAFF_TYPES: StaffType[] = ["GUIDE", "TRAINER", "CAPTAIN", "ADMIN"];
export const STAFF_STATUSES: StaffStatus[] = ["ACTIVE", "INACTIVE"];

export const TYPE_LABELS: Record<StaffType, string> = {
  GUIDE: "Guide",
  TRAINER: "Trainer",
  CAPTAIN: "Captain",
  ADMIN: "Admin",
};

export const STATUS_LABELS: Record<StaffStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const STATUS_STYLES: Record<StaffStatus, string> = {
  ACTIVE: "bg-green-100 text-green-900",
  INACTIVE: "bg-zinc-200 text-zinc-700",
};

// Days are stored at 00:00 UTC, so they are read and printed in UTC.
export function formatDay(iso: string | null, style: "short" | "weekday" = "short") {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...(style === "weekday"
      ? { weekday: "short", day: "2-digit", month: "short" }
      : { day: "2-digit", month: "short", year: "numeric" }),
  }).format(new Date(iso));
}

// The next `count` calendar days starting at `startIso` (YYYY-MM-DD).
export function nextDays(startIso: string, count: number) {
  const start = new Date(`${startIso}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
