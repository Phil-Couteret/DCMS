import {
  Injectable,
  Scope,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { TenantsService } from './tenants.service';

/**
 * Resolves tenant from X-Tenant-ID, X-Tenant-Slug, or Host subdomain.
 * Populates TenantContextService for the request.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private tenantContext: TenantContextService,
    private tenantsService: TenantsService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = (request.headers['x-tenant-id'] as string)?.trim();
    const tenantSlug = (request.headers['x-tenant-slug'] as string)?.trim();

    // Parse subdomain from Host if no header
    let slug = tenantSlug || null;
    if (!tenantId && !tenantSlug && request.headers.host) {
      const host = request.headers.host.split(':')[0];
      const firstPart = host.split('.')[0];
      // Platform-level: admin.domain or api.domain (no tenant subdomain)
      if (firstPart === 'admin' || firstPart === 'api') {
        slug = null;
      } else {
        const m = host.match(/^([a-z0-9-]+)\.(dcms|admin|api)\./i);
        if (m && m[1] && m[1] !== 'admin' && m[1] !== 'api') {
          slug = m[1];
        }
      }
    }

    const resolved = await this.tenantsService.resolve(tenantId || null, slug || null);
    if (resolved) {
      this.tenantContext.setTenant(resolved.id, resolved.slug);
    } else if (!tenantId && !slug) {
      // No tenant context - use default tenant for backward compatibility
      const defaultTenant = await this.tenantsService.getDefaultTenant();
      if (defaultTenant) {
        this.tenantContext.setTenant(defaultTenant.id, defaultTenant.slug);
      }
    }

    return next.handle();
  }
}
