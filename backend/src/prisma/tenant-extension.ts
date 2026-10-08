import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { currentTenantId, isUnscoped, TenantRequiredError } from '../tenant/tenant-context.js';

// Models shared by all tenants: never filtered. Queries that reach tenant
// data through them (e.g. a user's customer profiles) must filter by
// tenantId themselves.
export const GLOBAL_MODELS = new Set(['User', 'Tenant', 'Membership', 'PlatformAuditLog']);

const WHERE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
  'upsert',
]);

type Data = Record<string, unknown>;
interface RuntimeField {
  name: string;
  kind: string;
  type: string;
}

// Scopes every query on a tenant-scoped model to the current tenant: adds
// tenantId to its where clause and to every row it creates, nested creates
// included. A query with no tenant in context fails (400) rather than
// running unscoped.
//
// Convention this relies on: writes use foreign-key scalars (customerId),
// never nested `connect`, which Prisma cannot mix with the tenantId scalar.
// The database checks the rest: tenantId is NOT NULL, and triggers refuse a
// row that references another tenant's row (migration add_multitenancy).
export function tenantExtension(client: PrismaClient) {
  const runtime = (client as unknown as { _runtimeDataModel?: { models: Record<string, { fields: RuntimeField[] }> } })
    ._runtimeDataModel;
  if (!runtime?.models) throw new Error('Prisma runtime data model is not available: tenant scoping cannot run');

  const scoped = new Set(
    Object.entries(runtime.models)
      .filter(([name, m]) => !GLOBAL_MODELS.has(name) && m.fields.some((f) => f.name === 'tenantId'))
      .map(([name]) => name),
  );
  // model → relation field → related model
  const relations = new Map(
    Object.entries(runtime.models).map(([name, m]) => [
      name,
      new Map(m.fields.filter((f) => f.kind === 'object').map((f) => [f.name, f.type])),
    ]),
  );

  function checkTenant(value: unknown, tenantId: string, model: string) {
    if (value !== undefined && value !== tenantId) {
      throw new Error(`${model}: query names tenant ${String(value)} but the request is for ${tenantId}`);
    }
  }

  function scopeWhere(model: string, where: Data | undefined, tenantId: string): Data {
    checkTenant(where?.tenantId, tenantId, model);
    return { ...where, tenantId };
  }

  function createRow(model: string, data: Data, tenantId: string): Data {
    checkTenant(data.tenantId, tenantId, model);
    return nestedWrites(model, { ...data, tenantId }, tenantId);
  }

  // Adds tenantId to the rows created by nested writes in data.
  function nestedWrites(model: string, data: Data, tenantId: string): Data {
    const rels = relations.get(model);
    if (!rels) return data;
    let out = data;
    for (const [field, related] of rels) {
      const ops = data[field];
      if (!ops || typeof ops !== 'object' || !scoped.has(related)) continue;
      out = { ...out, [field]: relationOps(related, ops as Data, tenantId) };
    }
    return out;
  }

  function relationOps(model: string, ops: Data, tenantId: string): Data {
    const each = (v: unknown, fn: (d: Data) => Data) => (Array.isArray(v) ? v.map((x) => fn(x as Data)) : fn(v as Data));
    const out: Data = { ...ops };
    if (ops.create) out.create = each(ops.create, (d) => createRow(model, d, tenantId));
    if (ops.createMany) {
      const cm = ops.createMany as Data;
      out.createMany = { ...cm, data: each(cm.data, (d) => createRow(model, d, tenantId)) };
    }
    if (ops.connectOrCreate) {
      out.connectOrCreate = each(ops.connectOrCreate, (c) => ({ ...c, create: createRow(model, c.create as Data, tenantId) }));
    }
    if (ops.upsert) {
      out.upsert = each(ops.upsert, (u) => ({
        ...u,
        create: createRow(model, u.create as Data, tenantId),
        update: nestedWrites(model, u.update as Data, tenantId),
      }));
    }
    for (const op of ['update', 'updateMany'] as const) {
      if (ops[op] && typeof ops[op] === 'object') {
        out[op] = each(ops[op], (u) =>
          u.data && typeof u.data === 'object'
            ? { ...u, data: nestedWrites(model, u.data as Data, tenantId) }
            : nestedWrites(model, u, tenantId),
        );
      }
    }
    return out;
  }

  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!scoped.has(model) || isUnscoped()) return query(args);
          const tenantId = currentTenantId();
          if (!tenantId) throw new TenantRequiredError();
          const a = { ...(args as Data) };
          if (WHERE_OPS.has(operation)) a.where = scopeWhere(model, a.where as Data | undefined, tenantId);
          switch (operation) {
            case 'create':
              a.data = createRow(model, a.data as Data, tenantId);
              break;
            case 'createMany':
            case 'createManyAndReturn':
              a.data = Array.isArray(a.data)
                ? a.data.map((d: Data) => createRow(model, d, tenantId))
                : createRow(model, a.data as Data, tenantId);
              break;
            case 'upsert':
              a.create = createRow(model, a.create as Data, tenantId);
              a.update = nestedWrites(model, a.update as Data, tenantId);
              break;
            case 'update':
            case 'updateMany':
            case 'updateManyAndReturn':
              a.data = nestedWrites(model, a.data as Data, tenantId);
              break;
          }
          return query(a as typeof args);
        },
      },
    },
  });
}
