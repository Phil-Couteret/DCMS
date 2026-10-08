import { Injectable } from '@nestjs/common';
import { currentTenantId, requireTenantId } from './tenant-context.js';

// The current request's tenant, for services. Queries through PrismaService
// are filtered by it automatically; services need it explicitly only for raw
// SQL, advisory lock keys, and composite keys such as (tenantId, key).
@Injectable()
export class TenantContext {
  // Throws (400) when the request has no tenant.
  get tenantId(): string {
    return requireTenantId();
  }

  get maybeTenantId(): string | undefined {
    return currentTenantId();
  }
}
