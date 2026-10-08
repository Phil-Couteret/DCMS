import type { Prisma } from '../generated/prisma/client.js';

type Db = Pick<Prisma.TransactionClient, 'platformAuditLog'>;

export type PlatformAction = 'tenant.enter' | 'tenant.create' | 'tenant.update';

// Records a superadmin's platform action (PlatformAuditLog, a global model).
export function recordPlatformAction(
  db: Db,
  entry: { userId: string; action: PlatformAction; tenantId?: string | null; details?: Prisma.InputJsonValue },
) {
  return db.platformAuditLog.create({
    data: { userId: entry.userId, action: entry.action, tenantId: entry.tenantId ?? null, details: entry.details },
  });
}
