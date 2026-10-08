import type { Prisma } from '../generated/prisma/client.js';
import { runUnscoped } from './tenant-context.js';

type Db = Pick<Prisma.TransactionClient, 'membership' | 'customer' | 'staff'>;

// Accounts are global (one per person). Whether this one is also used by
// another tenant, through a membership or a customer or staff profile: then
// one center's staff must not change its email, password, name or role, or
// delete it, since that would act on the other center's user too.
export function usedByOtherTenants(db: Db, userId: string, tenantId: string) {
  return runUnscoped(async () => {
    const other = { userId, tenantId: { not: tenantId } };
    const counts = await Promise.all([
      db.membership.count({ where: other }),
      db.customer.count({ where: other }),
      db.staff.count({ where: other }),
    ]);
    return counts.some((n) => n > 0);
  });
}
