import { AsyncLocalStorage } from 'node:async_hooks';
import { BadRequestException } from '@nestjs/common';

// The tenant a request acts for, kept for the whole request (including
// inside Prisma transactions) by AsyncLocalStorage.
//
// Who sets it, in order of authority:
// 1. A verified token (JwtStrategy, PartnerJwtStrategy): the token's tenant.
// 2. The X-Tenant-ID header (TenantMiddleware), for public routes. With a
//    token, a header naming another tenant is rejected (403).
// 3. Transitional, until tenants are resolved from the host (plan step 4):
//    when the platform has exactly one active tenant, that tenant.
interface TenantStore {
  tenantId?: string;
  headerTenantId?: string;
  // Set only by runUnscoped, for the few lookups that must span tenants.
  unscoped?: boolean;
}

const storage = new AsyncLocalStorage<TenantStore>();

export class TenantRequiredError extends BadRequestException {
  constructor() {
    super('This request needs a tenant: send the X-Tenant-ID header');
  }
}

export function runWithStore<T>(fn: () => T): T {
  return storage.run({}, fn);
}

// Prisma queries are lazy: they run when awaited. Both helpers below await
// fn inside the context, so a query returned by fn still runs in it.

// Runs fn for one tenant, e.g. from a script or a test.
export function runInTenant<T>(tenantId: string, fn: () => T | PromiseLike<T>): Promise<T> {
  return storage.run({ tenantId }, async () => await fn());
}

// Runs fn with tenant filtering off. Only for lookups that find which
// tenant something belongs to (a partner by API key at login); never for
// returning data to a caller.
export function runUnscoped<T>(fn: () => T | PromiseLike<T>): Promise<T> {
  return storage.run({ ...storage.getStore(), unscoped: true }, async () => await fn());
}

export function tenantStore(): TenantStore | undefined {
  return storage.getStore();
}

// The current tenant, or undefined if none is known yet.
export function currentTenantId(): string | undefined {
  return storage.getStore()?.tenantId;
}

// The current tenant; throws (400) when the request has none.
export function requireTenantId(): string {
  const id = currentTenantId();
  if (!id) throw new TenantRequiredError();
  return id;
}

export function setTenantId(tenantId: string) {
  const store = storage.getStore();
  if (!store) throw new Error('setTenantId outside a request context');
  store.tenantId = tenantId;
}

export function isUnscoped() {
  return storage.getStore()?.unscoped === true;
}
