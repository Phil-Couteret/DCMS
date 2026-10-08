import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentTenantId, setTenantId, TenantRequiredError, tenantStore } from './tenant-context.js';

const CACHE_MS = 30_000;

// Looks up tenants (a global model, never tenant-filtered) and puts the
// resolved one into the request context.
@Injectable()
export class TenantsService {
  private active = new Map<string, { ok: boolean; at: number }>();
  private slugs = new Map<string, { id: string | null; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async isActive(tenantId: string) {
    const hit = this.active.get(tenantId);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.ok;
    const row = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { isActive: true } });
    const ok = row?.isActive === true;
    this.active.set(tenantId, { ok, at: Date.now() });
    return ok;
  }

  // The active tenant with this id or slug; 404 for an unknown or inactive
  // one, so a public site for it shows "not found". Slugs are cached like
  // activation (30 seconds).
  async idOf(ref: { id: string } | { slug: string }): Promise<string> {
    let id: string | undefined;
    if ('id' in ref) {
      id = ref.id;
    } else {
      const hit = this.slugs.get(ref.slug);
      if (hit && Date.now() - hit.at < CACHE_MS) id = hit.id ?? undefined;
      else {
        const row = await this.prisma.tenant.findUnique({ where: { slug: ref.slug }, select: { id: true } });
        this.slugs.set(ref.slug, { id: row?.id ?? null, at: Date.now() });
        id = row?.id;
      }
    }
    if (!id || !(await this.isActive(id))) throw new NotFoundException('Unknown tenant');
    return id;
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

  // The tenant a public request names (TenantMiddleware): already checked
  // to exist and be active.
  useHeaderTenant(tenantId: string) {
    const store = tenantStore();
    if (store) store.headerTenantId = tenantId;
    setTenantId(tenantId);
  }

  // The request's tenant; throws (400) when it names none.
  resolve(): string {
    const current = currentTenantId();
    if (!current) throw new TenantRequiredError();
    return current;
  }

  forget(tenantId?: string) {
    if (tenantId) this.active.delete(tenantId);
    else this.active.clear();
    // A slug may have been renamed or reused.
    this.slugs.clear();
  }
}
