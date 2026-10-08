import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentTenantId, isPlatform, setTenantId, TenantRequiredError, tenantStore } from './tenant-context.js';

const CACHE_MS = 30_000;

// Looks up tenants (a global model, never tenant-filtered) and puts the
// resolved one into the request context.
@Injectable()
export class TenantsService {
  private active = new Map<string, { ok: boolean; at: number }>();
  private single: { id: string | null; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async isActive(tenantId: string) {
    const hit = this.active.get(tenantId);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.ok;
    const row = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { isActive: true } });
    const ok = row?.isActive === true;
    this.active.set(tenantId, { ok, at: Date.now() });
    return ok;
  }

  // The only active tenant, or null when there are several (or none).
  // Transitional: lets requests without a tenant keep working while the
  // platform has one tenant. Removed when the host names the tenant (step 4).
  async singleActiveTenant(): Promise<string | null> {
    if (this.single && Date.now() - this.single.at < CACHE_MS) return this.single.id;
    const rows = await this.prisma.tenant.findMany({ where: { isActive: true }, select: { id: true }, take: 2 });
    this.single = { id: rows.length === 1 ? rows[0].id : null, at: Date.now() };
    return this.single.id;
  }

  // The tenant named by a verified token. A header naming another tenant is
  // refused rather than followed; an inactive tenant signs everyone out.
  async useTokenTenant(tenantId: string) {
    const header = tenantStore()?.headerTenantId;
    if (header && header !== tenantId) {
      throw new ForbiddenException('The X-Tenant-ID header does not match your session');
    }
    if (!(await this.isActive(tenantId))) throw new UnauthorizedException('This center is not active');
    setTenantId(tenantId);
  }

  // The tenant named by the X-Tenant-ID header (public routes).
  async useHeaderTenant(tenantId: string) {
    if (!(await this.isActive(tenantId))) throw new NotFoundException('Unknown tenant');
    const store = tenantStore();
    if (store) store.headerTenantId = tenantId;
    setTenantId(tenantId);
  }

  // The request's tenant, applying the transitional single-tenant fallback
  // (as the Prisma extension does for queries) for code that needs the id
  // before running any query. Throws (400) when there is none.
  async resolve(): Promise<string> {
    const current = currentTenantId();
    if (current) return current;
    const only = isPlatform() ? null : await this.singleActiveTenant();
    if (!only) throw new TenantRequiredError();
    setTenantId(only);
    return only;
  }

  forget(tenantId?: string) {
    if (tenantId) this.active.delete(tenantId);
    else this.active.clear();
    this.single = null;
  }
}
