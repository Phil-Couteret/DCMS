import { Injectable, Scope } from '@nestjs/common';

/**
 * Request-scoped service providing current tenant context.
 * Tenant is resolved by TenantMiddleware from X-Tenant-ID, X-Tenant-Slug, or subdomain.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private tenantId: string | null = null;
  private tenantSlug: string | null = null;

  setTenant(tenantId: string | null, tenantSlug?: string | null): void {
    this.tenantId = tenantId;
    this.tenantSlug = tenantSlug ?? null;
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  getTenantSlug(): string | null {
    return this.tenantSlug;
  }

  hasTenant(): boolean {
    return this.tenantId != null;
  }
}
