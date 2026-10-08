import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithStore } from './tenant-context.js';
import { TenantsService } from './tenants.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Opens the request's tenant context and applies the X-Tenant-ID header.
// Token checks (JwtStrategy, PartnerJwtStrategy) run later, inside the same
// context, and take precedence.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    runWithStore(() => {
      const header = req.header('x-tenant-id');
      if (header === undefined) return next();
      if (!UUID.test(header)) return next(new BadRequestException('X-Tenant-ID must be a tenant id'));
      this.tenants.useHeaderTenant(header).then(() => next(), next);
    });
  }
}
