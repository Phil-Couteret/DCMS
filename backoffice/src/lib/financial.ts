import type { ExpenseCategory } from "@/lib/api";

export const FINANCIAL_TABS = [
  { key: "today", label: "Daily" },
  { key: "closed", label: "Closed Days" },
  { key: "bills", label: "Historical Bills" },
  { key: "tax", label: "Quarterly Tax" },
] as const;
export type FinancialTab = (typeof FINANCIAL_TABS)[number]["key"];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["GASOLINE", "TANK_NET", "GLUE", "EQUIPMENT", "MAINTENANCE", "OTHER"];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  GASOLINE: "Gasoline",
  TANK_NET: "Tank Net",
  GLUE: "Glue",
  EQUIPMENT: "New Equipment",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

export const QUARTER_LABELS: Record<number, string> = {
  1: "Q1 (Jan – Mar)",
  2: "Q2 (Apr – Jun)",
  3: "Q3 (Jul – Sep)",
  4: "Q4 (Oct – Dec)",
};

export function financialHref(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
  return `/dashboard/financial?${query}`;
}

// The first and last day of the month an ISO date falls in.
export function monthBounds(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

// Negative amounts in red, others in the given colour.
export function signClass(value: string, positive = "text-zinc-900") {
  return Number(value) < 0 ? "text-red-700" : positive;
}
