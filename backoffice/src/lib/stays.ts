import type { StayCostCategory } from "@/lib/api";

export const STAY_COST_CATEGORIES: StayCostCategory[] = ["INSURANCE", "EQUIPMENT", "CLOTHES", "GOODIES", "BEVERAGES", "OTHER"];

export const STAY_COST_LABELS: Record<StayCostCategory, string> = {
  INSURANCE: "Insurance",
  EQUIPMENT: "Equipment",
  CLOTHES: "Clothes",
  GOODIES: "Goodies",
  BEVERAGES: "Beverages",
  OTHER: "Other",
};

// The badge on each stay, by the number of fun dives in it.
export function volumeBadge(totalDives: number) {
  if (totalDives >= 9) return { label: "High volume", className: "bg-green-100 text-green-900" };
  if (totalDives >= 6) return { label: "Medium volume", className: "bg-blue-100 text-blue-900" };
  if (totalDives >= 3) return { label: "Low volume", className: "bg-amber-100 text-amber-900" };
  return { label: "New stay", className: "bg-zinc-100 text-zinc-700" };
}
