import type { Tank, TankSize, TankStatus, TankTestState } from "@/lib/api";

// Tanks (Equipment → Tanks). The API works out when each test is next due:
// a visual inspection every year, a hydrostatic test every five years.

export const TANK_SIZES: TankSize[] = ["10L", "12L", "15L", "Nitrox12L", "Nitrox15L"];

export const TANK_SIZE_LABELS: Record<TankSize, string> = {
  "10L": "10 L",
  "12L": "12 L",
  "15L": "15 L",
  Nitrox12L: "Nitrox 12 L",
  Nitrox15L: "Nitrox 15 L",
};

export const TANK_STATUS_LABELS: Record<TankStatus, string> = { ACTIVE: "In use", RETIRED: "Retired" };

export const TEST_STATE_LABELS: Record<TankTestState, string> = {
  OK: "OK",
  DUE_SOON: "Due soon",
  OVERDUE: "Overdue",
  NO_RECORD: "No date",
};

export const TEST_STATE_STYLES: Record<TankTestState, string> = {
  OK: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  DUE_SOON: "bg-amber-50 text-amber-900 ring-amber-300",
  OVERDUE: "bg-red-50 text-red-800 ring-red-200",
  NO_RECORD: "bg-zinc-100 text-zinc-700 ring-zinc-300",
};

// The test filter: a tank's worst test.
export const TEST_FILTERS = [
  { key: "overdue", label: "Overdue or no date" },
  { key: "dueSoon", label: "Due within 30 days" },
  { key: "ok", label: "All tests OK" },
] as const;
export type TestFilter = (typeof TEST_FILTERS)[number]["key"];

const states = (t: Tank) => [t.visualState, t.hydrostaticState];

export function needsTest(t: Tank) {
  return t.status === "ACTIVE" && states(t).some((s) => s === "OVERDUE" || s === "NO_RECORD");
}

export function testDueSoon(t: Tank) {
  return t.status === "ACTIVE" && !needsTest(t) && states(t).includes("DUE_SOON");
}

export function matchesTestFilter(t: Tank, filter: TestFilter | undefined) {
  if (!filter) return true;
  if (filter === "overdue") return needsTest(t);
  if (filter === "dueSoon") return testDueSoon(t);
  return states(t).every((s) => s === "OK");
}
