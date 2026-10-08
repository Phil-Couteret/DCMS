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

export interface Usage {
  used: number;
  authorized: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  counts: { staff: number; locations: number; diveSites: number; boats: number; customers: number; bookings: number };
  quotas: Quotas;
  // Used against authorized. Not enforced yet (MULTITENANT_PLAN.md step 7).
  usage: {
    locations: Usage;
    diveSites: Usage;
    boats: Usage;
    users: Usage;
    customers: Usage;
    storage: { usedBytes: number; authorizedBytes: number; pricePerGbMonth: number };
  };
}

export interface PlatformOverview {
  tenants: number;
  activeTenants: number;
  customers: number;
  bookings: number;
  storageBytes: number;
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface Invitation {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "INSTRUCTOR";
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  invitedBy: { email: string } | null;
}

// A sent invitation. emailed false: no email went out (SMTP not set up or
// failed); the link must be passed on by hand.
export interface SentInvitation {
  email: string;
  link: string;
  emailed: boolean;
}

// The invitation page's view of a link (public).
export interface InvitationPreview {
  email: string;
  name: string | null;
  role: "ADMIN" | "INSTRUCTOR";
  tenant: { name: string; slug: string };
  status: InvitationStatus;
  expiresAt: string;
  existingAccount: boolean;
  customerAccount: boolean;
  signInUrl: string;
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
  firstLocation?: { name: string; type: string };
  firstAdmin?: { email: string; name?: string };
  // Left out, the platform defaults (Atlantic/Canary, EUR, English, IGIC 7%).
  timeZone?: string;
  currency?: string;
  defaultLanguage?: string;
  taxName?: string;
  taxRate?: number;
}

export function createTenant(data: NewTenant) {
  return apiFetch<{ tenant: Tenant; invitation: SentInvitation | null }>("/superadmin/tenants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getPlatformOverview() {
  return apiFetch<PlatformOverview>("/superadmin/overview");
}

export function getTenantInvitations(id: string) {
  return apiFetch<Invitation[]>(`/superadmin/tenants/${id}/invitations`);
}

export function inviteToTenant(id: string, data: { email: string; name?: string; role?: "ADMIN" | "INSTRUCTOR" }) {
  return apiFetch<SentInvitation>(`/superadmin/tenants/${id}/invitations`, { method: "POST", body: JSON.stringify(data) });
}

export function updateTenant(
  id: string,
  data: Partial<{ name: string; slug: string; plan: TenantPlan; isActive: boolean; quotas: Partial<Quotas> }>,
) {
  return apiFetch<Tenant>(`/superadmin/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getAuditLog() {
  return apiFetch<AuditEntry[]>("/superadmin/audit-log");
}
