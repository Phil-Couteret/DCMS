import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithStore } from './tenant-context.js';
import { isSlug, slugFromHost, slugFromOrigin } from './tenant-host.js';
import { TenantsService } from './tenants.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Opens the request's tenant context and applies the tenant the request
// names, from any of:
// - X-Tenant-ID (a tenant id) or X-Tenant-Slug (a slug), which the Next.js
//   servers and the public site's browser code send;
// - the Origin of a browser request, or the Host, when it is a tenant
//   subdomain ({slug}.<domain>, TENANT_DOMAINS).
// When several are present they must name the same tenant (400 otherwise).
// Token checks (JwtStrategy, PartnerJwtStrategy) run later, inside the same
// context, take precedence, and refuse a request naming another tenant (403).
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    runWithStore(() => {
      this.resolve(req).then(
        (tenantId) => (tenantId ? this.tenants.useHeaderTenant(tenantId) : undefined),
      ).then(() => next(), next);
    });
  }

  private async resolve(req: Request): Promise<string | null> {
    const id = req.header('x-tenant-id');
    if (id !== undefined && !UUID.test(id)) throw new BadRequestException('X-Tenant-ID must be a tenant id');
    const slug = req.header('x-tenant-slug')?.trim().toLowerCase();
    if (slug !== undefined && !isSlug(slug)) throw new BadRequestException('X-Tenant-Slug must be a tenant slug');

    const named = [
      id ? await this.tenants.idOf({ id }) : null,
      slug ? await this.tenants.idOf({ slug }) : null,
      ...(await Promise.all(
        [slugFromOrigin(req.header('origin')), slugFromHost(req.header('host'))]
          .filter((s): s is string => s !== null)
          .map((s) => this.tenants.idOf({ slug: s })),
      )),
    ].filter((t): t is string => t !== null);
    if (new Set(named).size > 1) throw new BadRequestException('The request names two different tenants');
    return named[0] ?? null;
  }
}
