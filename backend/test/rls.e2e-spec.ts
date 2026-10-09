import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runInTenant, runUnscoped } from '../src/tenant/tenant-context.js';

// Row-level security (docs/MULTITENANT_PLAN.md, step 6): the database keeps
// tenants apart on its own, whatever the SQL. Raw queries here bypass the
// Prisma extension on purpose. Also run with the extension switched off:
//
//   npm run test:e2e:rls

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
const tenant: Record<'p' | 'q', { id: string; token: string; boat: string }> = {} as never;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  for (const key of ['p', 'q'] as const) {
    const t = await prisma.tenant.create({ data: { name: `RLS ${key} ${run}`, slug: `rls-${key}-${run}` } });
    const user = await prisma.user.create({
      data: {
        email: `rls-${key}-${run}@example.test`,
        passwordHash: 'x',
        role: 'ADMIN',
        memberships: { create: { tenantId: t.id, role: 'ADMIN' } },
      },
    });
    const boat = await runInTenant(t.id, () =>
      prisma.boat.create({ data: { name: `RLS boat ${key}`, capacity: 6, registrationNumber: `RLS-${key}-${run}` } }),
    );
    tenant[key] = {
      id: t.id,
      boat: boat.id,
      token: await jwt.signAsync({ sub: user.id, email: user.email, role: 'ADMIN', tenantId: t.id }),
    };
  }
}, 60_000);

// Cleanup crosses tenants: unscoped, which row-level security lets through.
afterAll(() =>
  runUnscoped(async () => {
    if (prisma) {
      const ids = Object.values(tenant).map((t) => t.id);
      await prisma.$executeRaw`DELETE FROM "Boat" WHERE "tenantId" = ANY(${ids}::text[])`;
      await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
      await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
    }
    await app?.close();
  }),
);

const boatsVisible = () => prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Boat" WHERE id IN (${tenant.p.boat}, ${tenant.q.boat})`;

describe('row-level security', () => {
  it('is enabled, forced and has the tenant policy on every tenant table', async () => {
    const tables = await prisma.$queryRaw<{ table_name: string; rls: boolean; forced: boolean; policies: bigint }[]>`
      SELECT c.table_name, k.relrowsecurity AS rls, k.relforcerowsecurity AS forced,
             (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.table_name AND p.policyname = 'tenant_isolation') AS policies
      FROM information_schema.columns c JOIN pg_class k ON k.relname = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenantId'
        AND c.table_name NOT IN ('Membership', 'PlatformAuditLog', 'Invitation', 'User')`;
    expect(tables.length).toBeGreaterThan(30);
    const missing = tables.filter((t) => !t.rls || !t.forced || Number(t.policies) !== 1).map((t) => t.table_name);
    expect(missing).toEqual([]);
  });

  it('a session with no tenant sees no tenant rows (fails closed)', async () => {
    expect(await boatsVisible()).toEqual([]);
  });

  it("a tenant's session sees only its own rows, whatever the SQL says", async () => {
    expect((await runInTenant(tenant.p.id, boatsVisible)).map((r) => r.id)).toEqual([tenant.p.boat]);
    expect((await runInTenant(tenant.q.id, boatsVisible)).map((r) => r.id)).toEqual([tenant.q.boat]);
    // An update aimed at the other tenant's row changes nothing.
    const changed = await runInTenant(tenant.p.id, () => prisma.$executeRaw`UPDATE "Boat" SET name = 'hacked' WHERE id = ${tenant.q.boat}`);
    expect(changed).toBe(0);
    const deleted = await runInTenant(tenant.p.id, () => prisma.$executeRaw`DELETE FROM "Boat" WHERE id = ${tenant.q.boat}`);
    expect(deleted).toBe(0);
  });

  it("refuses a row written into another tenant", async () => {
    await expect(
      runInTenant(tenant.p.id, () =>
        prisma.$executeRaw`INSERT INTO "Boat" (id, "tenantId", name, capacity, "registrationNumber", "updatedAt")
          VALUES (${randomUUID()}, ${tenant.q.id}, 'smuggled', 4, ${`X-${run}`}, now())`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('follows a tenant switch inside one transaction', async () => {
    const seen = await prisma.$transaction(async (tx) => {
      const p = await runInTenant(tenant.p.id, () => tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Boat" WHERE id IN (${tenant.p.boat}, ${tenant.q.boat})`);
      const q = await runInTenant(tenant.q.id, () => tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Boat" WHERE id IN (${tenant.p.boat}, ${tenant.q.boat})`);
      return [p.map((r) => r.id), q.map((r) => r.id)];
    });
    expect(seen).toEqual([[tenant.p.boat], [tenant.q.boat]]);
  });

  it('a failed transaction leaves no broken connection in the pool', async () => {
    for (let i = 0; i < 15; i++) {
      await expect(
        runInTenant(tenant.p.id, () =>
          prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT 1`;
            await tx.$executeRaw`SELECT 1/0`;
          }),
        ),
      ).rejects.toThrow();
    }
    expect((await runInTenant(tenant.p.id, boatsVisible)).map((r) => r.id)).toEqual([tenant.p.boat]);
  });

  it('runUnscoped (platform reads) sees every tenant', async () => {
    expect((await runUnscoped(boatsVisible)).map((r) => r.id).sort()).toEqual([tenant.p.boat, tenant.q.boat].sort());
  });

  it('concurrent requests for two tenants never see each other', async () => {
    const list = async (key: 'p' | 'q') => {
      const res = await fetch(`${base}/boats`, { headers: { Authorization: `Bearer ${tenant[key].token}` } });
      return { key, ids: ((await res.json()) as { id: string }[]).map((b) => b.id) };
    };
    const results = await Promise.all(Array.from({ length: 60 }, (_, i) => list(i % 2 ? 'p' : 'q')));
    for (const r of results) expect(r.ids).toEqual([tenant[r.key].boat]);
  });
});
