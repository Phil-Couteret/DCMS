import type { EquipmentCondition, EquipmentStatus } from "@/lib/api";
import { centerNow } from "@/lib/center-time";

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

// Overdue: a next-maintenance date before today, Canary time. Decommissioned
// items are out of service and never count.
export function isOverdue(item: { status: EquipmentStatus; nextMaintenance: string | null }) {
  return (
    item.status !== "DECOMMISSIONED" &&
    item.nextMaintenance !== null &&
    item.nextMaintenance.slice(0, 10) < centerNow().isoDate
  );
}

export function formatDay(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatEur(value: string | number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(Number(value));
}
