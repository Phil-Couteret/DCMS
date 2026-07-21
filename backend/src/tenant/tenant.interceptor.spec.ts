// tenant.interceptor.ts imports TenantsService (for its constructor type),
// which imports bcrypt (used elsewhere in that file for seeding a default
// admin). bcrypt ships a native binary that isn't available in every
// environment; jest.mock replaces the module before anything transitively
// requires it, so this spec never touches the real binding.
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantContextService } from './tenant-context.service';

// Hand-rolled mock for TenantsService - the interceptor only calls
// .resolve() and .getDefaultTenant(), so a minimal fake covering those two
// methods is a faithful enough substitute for this unit test.
function makeTenantsServiceMock(overrides: {
  resolve?: jest.Mock;
  getDefaultTenant?: jest.Mock;
} = {}) {
  return {
    resolve: overrides.resolve ?? jest.fn().mockResolvedValue(null),
    getDefaultTenant: overrides.getDefaultTenant ?? jest.fn().mockResolvedValue(null),
  } as any;
}

// The interceptor now also fire-and-forget audit-logs superadmin tenant
// switches via PrismaService - a minimal mock covering the one call it makes.
function makePrismaMock() {
  return {
    audit_logs: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;
}

function makeContext(headers: Record<string, string> = {}, user?: any): ExecutionContext {
  const request = { headers, user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

const next: CallHandler = { handle: () => of(null) };

describe('TenantInterceptor', () => {
  let tenantContext: TenantContextService;

  beforeEach(() => {
    tenantContext = new TenantContextService();
  });

  it('sets tenant context from the JWT tenantId for a regular authenticated user, ignoring absent header', async () => {
    const resolve = jest.fn().mockResolvedValue({ id: 'tenant-a', slug: 'deep-blue' });
    const tenantsService = makeTenantsServiceMock({ resolve });
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, makePrismaMock());

    const context = makeContext({}, { tenantId: 'tenant-a', role: 'admin' });
    await (await interceptor.intercept(context, next)).toPromise();

    expect(resolve).toHaveBeenCalledWith('tenant-a', null);
    expect(tenantContext.getTenantId()).toBe('tenant-a');
  });

  it('allows a header that matches the JWT tenantId', async () => {
    const resolve = jest.fn().mockImplementation((id: string | null, slug: string | null) => {
      if (id === 'tenant-a' || slug === 'deep-blue') {
        return Promise.resolve({ id: 'tenant-a', slug: 'deep-blue' });
      }
      return Promise.resolve(null);
    });
    const tenantsService = makeTenantsServiceMock({ resolve });
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, makePrismaMock());

    const context = makeContext(
      { 'x-tenant-slug': 'deep-blue' },
      { tenantId: 'tenant-a', role: 'admin' },
    );
    await (await interceptor.intercept(context, next)).toPromise();

    expect(tenantContext.getTenantId()).toBe('tenant-a');
  });

  it('rejects a header/subdomain tenant that disagrees with the JWT tenantId (the cross-tenant leak fix)', async () => {
    const resolve = jest.fn().mockImplementation((id: string | null) => {
      if (id === 'tenant-b') return Promise.resolve({ id: 'tenant-b', slug: 'other-center' });
      return Promise.resolve(null);
    });
    const tenantsService = makeTenantsServiceMock({ resolve });
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, makePrismaMock());

    // Attacker-controlled header claims a different tenant than the caller's JWT.
    const context = makeContext(
      { 'x-tenant-id': 'tenant-b' },
      { tenantId: 'tenant-a', role: 'admin' },
    );

    await expect(async () => {
      await (await interceptor.intercept(context, next)).toPromise();
    }).rejects.toThrow(ForbiddenException);
  });

  it('rejects (does not fall back to unscoped) when the JWT tenant no longer resolves', async () => {
    const resolve = jest.fn().mockResolvedValue(null); // tenant deactivated/deleted
    const tenantsService = makeTenantsServiceMock({ resolve });
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, makePrismaMock());

    const context = makeContext({}, { tenantId: 'tenant-a', role: 'admin' });

    await expect(async () => {
      await (await interceptor.intercept(context, next)).toPromise();
    }).rejects.toThrow(ForbiddenException);
    expect(tenantContext.hasTenant()).toBe(false);
  });

  it('leaves superadmin (tenantId: null) at platform level when no header is sent', async () => {
    const resolve = jest.fn();
    const tenantsService = makeTenantsServiceMock({ resolve });
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, makePrismaMock());

    const context = makeContext({}, { tenantId: null, role: 'superadmin' });
    await (await interceptor.intercept(context, next)).toPromise();

    expect(resolve).not.toHaveBeenCalled();
    expect(tenantContext.hasTenant()).toBe(false);
  });

  it('lets superadmin switch tenant context via header, and audit-logs the switch', async () => {
    const resolve = jest.fn().mockResolvedValue({ id: 'tenant-c', slug: 'other' });
    const tenantsService = makeTenantsServiceMock({ resolve });
    const prisma = makePrismaMock();
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, prisma);

    const context = makeContext({ 'x-tenant-id': 'tenant-c' }, { tenantId: null, role: 'superadmin', sub: 'superadmin-1' });
    await (await interceptor.intercept(context, next)).toPromise();

    expect(tenantContext.getTenantId()).toBe('tenant-c');
    // Fire-and-forget - flush microtasks so the .create() call has landed.
    await Promise.resolve();
    expect(prisma.audit_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenant_id: 'tenant-c',
          user_id: 'superadmin-1',
          user_type: 'superadmin',
          action: 'tenant_switch',
          resource_type: 'tenant',
          resource_id: 'tenant-c',
        }),
      }),
    );
  });

  it('falls back to header/subdomain resolution for unauthenticated requests (e.g. pre-login)', async () => {
    const resolve = jest.fn().mockResolvedValue({ id: 'tenant-a', slug: 'deep-blue' });
    const tenantsService = makeTenantsServiceMock({ resolve });
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, makePrismaMock());

    const context = makeContext({ 'x-tenant-slug': 'deep-blue' }, undefined);
    await (await interceptor.intercept(context, next)).toPromise();

    expect(resolve).toHaveBeenCalledWith(null, 'deep-blue');
    expect(tenantContext.getTenantId()).toBe('tenant-a');
  });

  it('falls back to the default tenant when unauthenticated and no header/subdomain is present', async () => {
    const getDefaultTenant = jest.fn().mockResolvedValue({ id: 'default-tenant', slug: 'default' });
    const tenantsService = makeTenantsServiceMock({ getDefaultTenant });
    const interceptor = new TenantInterceptor(tenantContext, tenantsService, makePrismaMock());

    const context = makeContext({}, undefined);
    await (await interceptor.intercept(context, next)).toPromise();

    expect(getDefaultTenant).toHaveBeenCalled();
    expect(tenantContext.getTenantId()).toBe('default-tenant');
  });
});
