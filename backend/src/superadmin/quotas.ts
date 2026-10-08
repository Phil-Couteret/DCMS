import type { Prisma } from '../generated/prisma/client.js';

// A tenant's authorized limits (Tenant.quotas), with the defaults the
// original TenantManagement used. Shown against usage; enforcement comes in
// MULTITENANT_PLAN.md step 7.
export const DEFAULT_QUOTAS = {
  locations: 20,
  diveSites: 15,
  boats: 10,
  users: 20,
  customers: 500,
  storageGb: 5,
  // What a center pays per GB per month (in the platform's currency).
  storagePricePerGbMonth: 0,
};

export type Quotas = typeof DEFAULT_QUOTAS;
export const QUOTA_KEYS = Object.keys(DEFAULT_QUOTAS) as (keyof Quotas)[];

// The stored quotas with defaults for anything missing or malformed.
export function quotasOf(stored: Prisma.JsonValue | null | undefined): Quotas {
  const raw = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const out = { ...DEFAULT_QUOTAS };
  for (const key of QUOTA_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return out;
}
