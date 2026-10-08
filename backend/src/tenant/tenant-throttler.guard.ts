import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { currentTenantId } from './tenant-context.js';

// Rate limits per tenant and client IP, not per IP alone: a busy center's
// visitors (or a shared office IP) do not use up another center's allowance.
// Runs after TenantMiddleware, so the tenant the request names is known.
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = await super.getTracker(req);
    return `${currentTenantId() ?? 'none'}:${ip}`;
  }
}
