// Platform constants and labels, safe in client components (no server
// imports; lib/platform.ts holds the API calls).

export type TenantPlan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
export const TENANT_PLANS: TenantPlan[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];
export const PLAN_LABELS: Record<TenantPlan, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

// Same rule as the API: a DNS label, lowercase.
export const SLUG_PATTERN = "[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?";

export interface Quotas {
  locations: number;
  diveSites: number;
  boats: number;
  users: number;
  customers: number;
  storageGb: number;
  storagePricePerGbMonth: number;
}

export const QUOTA_LABELS: Record<keyof Quotas, string> = {
  locations: "Locations",
  diveSites: "Dive sites",
  boats: "Boats",
  users: "Users",
  customers: "Customers",
  storageGb: "Storage (GB)",
  storagePricePerGbMonth: "Price per GB per month",
};
