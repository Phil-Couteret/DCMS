import {
  Injectable,
  Scope,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { TenantsService } from './tenants.service';

/**
 * Resolves the tenant for the current request.
 *
 * For authenticated admin/staff requests (request.user set by JwtAuthGuard,
 * which runs before this interceptor), the tenant comes from the JWT's
 * tenantId - NOT from the client-supplied X-Tenant-ID/X-Tenant-Slug header or
 * Host subdomain. A client cannot override the tenant scope its own JWT was
 * issued for. Those headers are only trusted pre-login (no JWT exists yet) or
 * for a superadmin explicitly switching tenant context.
 *
 * If an authenticated non-superadmin request also carries a header/subdomain
 * that disagrees with its JWT's tenantId, the request is rejected (403)
 * rather than silently following the header - that mismatch is exactly the
 * cross-tenant data leak this interceptor previously allowed.
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

    const headerTenantId = (request.headers['x-tenant-id'] as string)?.trim() || null;
    const headerTenantSlug = (request.headers['x-tenant-slug'] as string)?.trim() || null;

    let subdomainSlug: string | null = null;
    if (!headerTenantId && !headerTenantSlug && request.headers.host) {
      const host = request.headers.host.split(':')[0];
      const firstPart = host.split('.')[0];
      if (firstPart !== 'admin' && firstPart !== 'api') {
        const m = host.match(/^([a-z0-9-]+)\.(dcms|admin|api)\./i);
        if (m && m[1] && m[1] !== 'admin' && m[1] !== 'api') {
          subdomainSlug = m[1];
        }
      }
    }

    const requestedSlug = headerTenantSlug || subdomainSlug;
    const requestedResolved =
      headerTenantId || requestedSlug
        ? await this.tenantsService.resolve(headerTenantId, requestedSlug)
        : null;

    // Populated by JwtAuthGuard (admin JWT strategy) for any authenticated,
    // non-@Public() route. Partner-authenticated requests (api-key or partner
    // JWT) don't carry this shape, so they fall through to the legacy
    // header/subdomain/default-tenant resolution below unchanged.
    const authUser = request.user as { tenantId?: string | null } | undefined;

    if (authUser && authUser.tenantId !== undefined) {
      if (authUser.tenantId === null) {
        // Superadmin: platform-level by default, may switch into a tenant
        // via header/subdomain.
        if (requestedResolved) {
          this.tenantContext.setTenant(requestedResolved.id, requestedResolved.slug);
        }
        return next.handle();
      }

      // Regular admin/staff user: tenant is authoritatively the JWT's tenantId.
      if (requestedResolved && requestedResolved.id !== authUser.tenantId) {
        throw new ForbiddenException(
          "Requested tenant does not match the authenticated user's tenant",
        );
      }

      const jwtTenant = await this.tenantsService.resolve(authUser.tenantId, null);
      if (!jwtTenant) {
        // Tenant was deactivated/deleted after the JWT was issued - do not
        // fall back to an unscoped ("no tenant filter") view.
        throw new ForbiddenException("Your account's tenant is inactive or no longer exists");
      }
      this.tenantContext.setTenant(jwtTenant.id, jwtTenant.slug);
      return next.handle();
    }

    // No admin-authenticated user (login endpoint, health check, or a
    // partner-authenticated request) - resolve from header/subdomain, or fall
    // back to the default tenant, as before.
    if (requestedResolved) {
      this.tenantContext.setTenant(requestedResolved.id, requestedResolved.slug);
    } else if (!headerTenantId && !requestedSlug) {
      const defaultTenant = await this.tenantsService.getDefaultTenant();
      if (defaultTenant) {
        this.tenantContext.setTenant(defaultTenant.id, defaultTenant.slug);
      }
    }

    return next.handle();
  }
}
