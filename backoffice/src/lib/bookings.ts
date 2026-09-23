import type { BookingStatus } from "@/lib/api";

export const STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export const ACTIVITY_LABELS: Record<string, string> = {
  SNORKELING: "Snorkeling",
  DISCOVER_SCUBA: "Discover Scuba",
  FUN_DIVE: "Fun Dive",
  OW_CERT: "Open Water Course",
  AOW_CERT: "Advanced Course",
  RESCUE_CERT: "Rescue Course",
  DM_CERT: "Divemaster Course",
};

export const SLOT_LABELS: Record<string, string> = {
  MORNING: "Morning · 08:00",
  AFTERNOON: "Afternoon · 14:00",
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

export const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-900",
  CONFIRMED: "bg-green-100 text-green-900",
  COMPLETED: "bg-blue-100 text-blue-900",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  NO_SHOW: "bg-red-100 text-red-900",
};

// The only moves the backoffice offers. The API itself accepts any status.
export const TRANSITIONS: Record<BookingStatus, { to: BookingStatus; label: string }[]> = {
  PENDING: [
    { to: "CONFIRMED", label: "Confirm" },
    { to: "CANCELLED", label: "Cancel" },
  ],
  CONFIRMED: [
    { to: "COMPLETED", label: "Complete" },
    { to: "NO_SHOW", label: "No Show" },
    { to: "CANCELLED", label: "Cancel" },
  ],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function isAllowedTransition(from: BookingStatus, to: BookingStatus) {
  return TRANSITIONS[from].some((t) => t.to === to);
}

// Booking dates are stored as the day at 00:00 UTC.
export function formatBookingDate(iso: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...(style === "long"
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : { day: "2-digit", month: "short", year: "numeric" }),
  }).format(new Date(iso));
}

export interface GuestNotes {
  certificationLevel: string | null;
  selectedEquipment: string[];
  totalPrice: number | null;
}

// Guest bookings store their extras as JSON in notes. Anything else is plain
// text written by staff, returned as null so the caller shows it as is.
export function parseGuestNotes(notes: string | null): GuestNotes | null {
  if (!notes) return null;
  try {
    const data = JSON.parse(notes) as Record<string, unknown>;
    if (typeof data !== "object" || data === null || !("selectedEquipment" in data)) return null;
    return {
      certificationLevel: typeof data.certificationLevel === "string" ? data.certificationLevel : null,
      selectedEquipment: Array.isArray(data.selectedEquipment)
        ? data.selectedEquipment.filter((x): x is string => typeof x === "string")
        : [],
      totalPrice: typeof data.totalPrice === "number" ? data.totalPrice : null,
    };
  } catch {
    return null;
  }
}
