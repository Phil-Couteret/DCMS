import type { Prisma } from '../generated/prisma/client.js';
import type { NumberSeries } from '../generated/prisma/enums.js';
import { requireTenantId } from './tenant-context.js';

// The next number of a tenant's series for a year (1, 2, 3 …). Must run
// inside the transaction that stores the numbered row: the upsert locks the
// counter row until commit, so concurrent creates take turns, and a rollback
// returns the number, so the series has no gaps.
export async function nextNumber(tx: Prisma.TransactionClient, series: NumberSeries, year: number) {
  const tenantId = requireTenantId();
  const [{ last }] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "NumberSequence" ("tenantId", "series", "year", "last")
    VALUES (${tenantId}, ${series}::"NumberSeries", ${year}, 1)
    ON CONFLICT ("tenantId", "series", "year") DO UPDATE SET "last" = "NumberSequence"."last" + 1
    RETURNING "last"`;
  return last;
}
