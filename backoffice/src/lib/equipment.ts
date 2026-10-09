import type { EquipmentCondition, EquipmentStatus } from "@/lib/api";

export const EQUIPMENT_TYPES = [
  "wetsuit",
  "bcd",
  "regulator",
  "mask",
  "fins",
  "boots",
  "weights",
  "computer",
] as const;

const TYPE_LABELS: Record<string, string> = {
  wetsuit: "Wetsuit",
  bcd: "BCD",
  regulator: "Regulator",
  mask: "Mask",
  fins: "Fins",
  boots: "Boots",
  weights: "Weights",
  computer: "Dive computer",
};

// Type is free text in the database, so "BCD" and "bcd" are the same type.
export function typeLabel(type: string) {
  return TYPE_LABELS[type.toLowerCase()] ?? type;
}

export const EQUIPMENT_STATUSES: EquipmentStatus[] = ["AVAILABLE", "RENTED", "MAINTENANCE", "DECOMMISSIONED"];

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  AVAILABLE: "Available",
  RENTED: "Rented",
  MAINTENANCE: "Maintenance",
  DECOMMISSIONED: "Decommissioned",
};

export const STATUS_STYLES: Record<EquipmentStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-900",
  RENTED: "bg-blue-100 text-blue-900",
  MAINTENANCE: "bg-yellow-100 text-yellow-900",
  DECOMMISSIONED: "bg-zinc-200 text-zinc-700",
};

export const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const CONDITION_STYLES: Record<EquipmentCondition, string> = {
  EXCELLENT: "bg-green-100 text-green-900",
  GOOD: "bg-blue-100 text-blue-900",
  FAIR: "bg-yellow-100 text-yellow-900",
  POOR: "bg-red-100 text-red-900",
};

export const MAINTENANCE_TYPES = ["routine", "repair", "inspection"] as const;

// Status moves the backoffice offers for each current status.
export const STATUS_ACTIONS: Record<EquipmentStatus, { to: EquipmentStatus; label: string }[]> = {
  AVAILABLE: [
    { to: "MAINTENANCE", label: "Mark Maintenance" },
    { to: "DECOMMISSIONED", label: "Decommission" },
  ],
  RENTED: [
    { to: "MAINTENANCE", label: "Mark Maintenance" },
    { to: "DECOMMISSIONED", label: "Decommission" },
  ],
  MAINTENANCE: [
    { to: "AVAILABLE", label: "Mark Available" },
    { to: "DECOMMISSIONED", label: "Decommission" },
  ],
  DECOMMISSIONED: [],
};

// Overdue: a next-maintenance date before today (an ISO date, center time).
// Decommissioned items are out of service and never count.
export function isOverdue(item: { status: EquipmentStatus; nextMaintenance: string | null }, today: string) {
  return item.status !== "DECOMMISSIONED" && item.nextMaintenance !== null && item.nextMaintenance.slice(0, 10) < today;
}

// The day three months after an ISO date ("2026-10-09" → "2027-01-09").
export function addMonths(isoDate: string, months: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// Due soon: next maintenance within three months of today, not yet overdue
// (the original's revision rule). Decommissioned items never count.
export function isDueSoon(item: { status: EquipmentStatus; nextMaintenance: string | null }, today: string) {
  if (item.status === "DECOMMISSIONED" || item.nextMaintenance === null) return false;
  const due = item.nextMaintenance.slice(0, 10);
  return due >= today && due < addMonths(today, 3);
}

export const CONDITIONS: EquipmentCondition[] = ["EXCELLENT", "GOOD", "FAIR", "POOR"];

// Case-insensitive search on type, brand, model, size and serial number.
export function matchesSearch(
  item: { type: string; brand: string; model: string | null; size: string | null; serialNumber: string | null },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [typeLabel(item.type), item.type, item.brand, item.model, item.size, item.serialNumber].some((v) =>
    (v ?? "").toLowerCase().includes(q),
  );
}

export function formatDay(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatCost(value: string | number | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value));
}
