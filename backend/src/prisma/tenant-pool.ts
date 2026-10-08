import pg from 'pg';
import { currentTenantId, isUnscoped } from '../tenant/tenant-context.js';

// The connection pool behind Prisma (PrismaService). Before each statement it
// sets the session settings the row-level security policies read
// (migration enable_row_level_security):
// - app.tenant_id: the current request's tenant ('' when there is none, and
//   the policies then show and accept no tenant rows);
// - app.rls_bypass: 'on' inside runUnscoped only (platform lookups).
// Both follow the request context (AsyncLocalStorage) statement by
// statement, so a transaction that switches tenant (runInTenant inside it)
// is covered too. A connection keeps what it last set, and the settings are
// re-sent only when they change, or after a rollback or an error (which can
// undo a setting made inside a transaction).

type Setting = { tenantId: string; bypass: boolean };
type Tracked = pg.PoolClient & { rlsKey?: string; rlsWrapped?: boolean };

const SET = "SELECT set_config('app.tenant_id', $1, false), set_config('app.rls_bypass', $2, false)";

function wanted(): Setting {
  return { tenantId: currentTenantId() ?? '', bypass: isUnscoped() };
}

const TRANSACTION_END = /^\s*(COMMIT|ROLLBACK|END|ABORT|RELEASE)\b/i;

const keyOf = (s: Setting) => `${s.tenantId}|${s.bypass ? 'on' : 'off'}`;

function statementText(config: unknown) {
  if (typeof config === 'string') return config;
  return typeof (config as { text?: unknown })?.text === 'string' ? (config as { text: string }).text : '';
}

// Makes every promise-style query on this client apply the setting first.
// Callback and submittable queries (not used by the Prisma adapter) pass
// through unchanged.
function track(client: Tracked) {
  if (client.rlsWrapped) return;
  client.rlsWrapped = true;
  const query = client.query.bind(client) as (...args: unknown[]) => unknown;
  const apply = async (setting: Setting) => {
    const key = keyOf(setting);
    if (client.rlsKey === key) return;
    client.rlsKey = undefined;
    await query({ text: SET, values: [setting.tenantId, setting.bypass ? 'on' : 'off'] });
    client.rlsKey = key;
  };
  (client as unknown as { query: unknown }).query = (...args: unknown[]) => {
    const last = args[args.length - 1];
    const submittable = typeof (args[0] as { submit?: unknown })?.submit === 'function';
    if (typeof last === 'function' || submittable) return query(...args);
    const setting = wanted();
    const text = statementText(args[0]);
    return (async () => {
      // Ending a transaction needs no tenant, and must go through even when
      // the transaction has failed (a SET would be refused, the ROLLBACK
      // never sent, and the connection returned to the pool still broken).
      if (!TRANSACTION_END.test(text)) await apply(setting);
      try {
        const result = await query(...args);
        // A rollback undoes settings made inside the transaction.
        if (/^\s*ROLLBACK\b/i.test(text)) client.rlsKey = undefined;
        return result;
      } catch (e) {
        client.rlsKey = undefined;
        throw e;
      }
    })();
  };
}

export class TenantPool extends pg.Pool {
  constructor(config: pg.PoolConfig) {
    super(config);
    this.on('connect', (client) => track(client as Tracked));
  }

  // pg's own pool.query runs the statement from a callback inside the pool,
  // where the request context may not be the caller's. Check out a client
  // here instead: awaiting keeps the caller's context, so the client's
  // wrapper (track) applies the caller's setting.
  override query(...args: unknown[]): never {
    const last = args[args.length - 1];
    if (typeof last === 'function') {
      return (super.query as (...a: unknown[]) => unknown)(...args) as never;
    }
    return (async () => {
      const client = (await this.connect()) as Tracked;
      track(client);
      try {
        return await (client.query as (...a: unknown[]) => Promise<unknown>)(...args);
      } finally {
        client.release();
      }
    })() as never;
  }
}
