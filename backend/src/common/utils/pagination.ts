/**
 * Shared pagination-query parsing (roadmap item 10, Phase 6.8): the
 * bookings/staff/boats/equipment/dive_sites list endpoints were fully
 * unbounded - `findMany()` with no `skip`/`take` at all - which is fine at
 * today's per-location data volumes but is a real risk as bookings/staff
 * history accumulates over years of operation.
 *
 * Design constraint: `frontend/src/services/dataService.js`'s `getAll()` is
 * called throughout the frontend (Schedule.jsx, Equipment.jsx, Bill.jsx,
 * Customers.jsx, BoatPrep.jsx, Financial.jsx, ...) with the result always
 * treated as a plain array, and several pages rely on getting the *complete*
 * list for correct client-side date-range filtering/aggregation. Changing
 * the response shape to an envelope (like `audit`'s `{ logs, total, limit,
 * offset }`) or defaulting to a bounded page would be a large, breaking,
 * cross-cutting change - or worse, a silent data-correctness bug if a page
 * quietly stopped seeing rows it used to aggregate correctly.
 *
 * So this is opt-in only: `skip`/`take` are optional query params that,
 * when omitted, parse to `{}` - spread into a Prisma `findMany()` call as
 * `...pagination`, `{}` is a complete no-op and every existing caller keeps
 * getting the same unbounded array it already gets today. A caller that
 * does pass `skip`/`take` (a future paginated UI, an API integration, etc.)
 * gets real Prisma-level pagination, still as a plain array - no envelope.
 */

export interface PaginationArgs {
  skip?: number;
  take?: number;
}

// Applied even when a caller opts in, so a misbehaving or malicious client
// can't request an effectively-unbounded page via an absurd `take`.
export const MAX_TAKE = 500;

export function parsePaginationQuery(skip?: string, take?: string): PaginationArgs {
  const args: PaginationArgs = {};

  if (skip !== undefined) {
    const parsedSkip = Number(skip);
    if (Number.isFinite(parsedSkip) && parsedSkip >= 0) {
      args.skip = Math.floor(parsedSkip);
    }
  }

  if (take !== undefined) {
    const parsedTake = Number(take);
    if (Number.isFinite(parsedTake) && parsedTake > 0) {
      args.take = Math.min(Math.floor(parsedTake), MAX_TAKE);
    }
  }

  return args;
}
