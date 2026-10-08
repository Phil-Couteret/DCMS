import type { CenterChoice } from "@/auth";
import { apiFetch } from "@/lib/api";

// The superadmin console's API (/superadmin) and the account's centers.

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

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  counts: { staff: number; locations: number; customers: number; bookings: number };
}

export interface TenantStats {
  tenant: Tenant;
  currency: string;
  timeZone: string;
  bookings: { total: number; byStatus: Record<string, number>; last30Days: number; upcoming: number };
  customers: { total: number; last30Days: number };
  // Decimal strings, in the platform currency (EUR).
  revenue: { invoiced: string; collected: string; collectedLast30Days: string };
  generatedAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
  tenant: { id: string; name: string; slug: string } | null;
}

export function getMyCenters() {
  return apiFetch<{ tenants: CenterChoice[]; platform: boolean }>("/auth/tenants");
}

export function getTenants() {
  return apiFetch<Tenant[]>("/superadmin/tenants");
}

export function getTenant(id: string) {
  return apiFetch<Tenant>(`/superadmin/tenants/${id}`);
}

export function getTenantStats(id: string) {
  return apiFetch<TenantStats>(`/superadmin/tenants/${id}/stats`);
}

export interface NewTenant {
  name: string;
  slug: string;
  plan: TenantPlan;
  // Left out, the platform defaults (Atlantic/Canary, EUR, English, IGIC 7%).
  timeZone?: string;
  currency?: string;
  defaultLanguage?: string;
  taxName?: string;
  taxRate?: number;
}

export function createTenant(data: NewTenant) {
  return apiFetch<Tenant>("/superadmin/tenants", { method: "POST", body: JSON.stringify(data) });
}

export function updateTenant(id: string, data: Partial<{ name: string; slug: string; plan: TenantPlan; isActive: boolean }>) {
  return apiFetch<Tenant>(`/superadmin/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getAuditLog() {
  return apiFetch<AuditEntry[]>("/superadmin/audit-log");
}
