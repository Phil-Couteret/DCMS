import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runUnscoped } from '../src/tenant/tenant-context.js';

// Release gate for multi-tenancy (docs/MULTITENANT_PLAN.md, step 1): a
// second tenant's data must be invisible and untouchable from the first.
// Runs the real app against the database in DATABASE_URL, creates tenant B
// with its own admin and records through the API, and removes it all again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/tenant-isolation.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tokenA: string;
let tokenB: string;
let tenantA: string;
let tenantB: string;
let adminB: string;
const ids: Record<string, string> = {};

async function call(method: string, path: string, token?: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function create(path: string, body: unknown) {
  const { status, data } = await call('POST', path, tokenB, body);
  if (status !== 201) throw new Error(`POST ${path} as tenant B → ${status} ${JSON.stringify(data)}`);
  // POST /partners answers { partner, apiKey, apiSecret }.
  const created = data as { id?: string; partner?: { id: string } };
  return created.id ?? created.partner!.id;
}

const SITE = {
  nameEs: `Iso ${run}`,
  nameEn: `Iso ${run}`,
  nameDe: `Iso ${run}`,
  nameFr: `Iso ${run}`,
  descriptionEs: 'x',
  descriptionEn: 'x',
  descriptionDe: 'x',
  descriptionFr: 'x',
  latitude: 28.1,
  longitude: -13.9,
  depthMin: 5,
  depthMax: 18,
  requiredCertLevel: 0,
  difficultyLevel: 2,
  waterTempRange: { min: 18, max: 23 },
  marineLife: [],
  pointsOfInterest: [],
  bestSeason: [],
  facilities: [],
  travelTimeMinutes: 10,
  maxDiversPerTrip: 10,
};

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  // Tenant A: the default tenant and one of its admins.
  const a = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
  tenantA = a.id;
  const memberA = await prisma.membership.findFirstOrThrow({
    where: { tenantId: tenantA, user: { role: 'ADMIN' } },
    include: { user: true },
  });
  tokenA = await jwt.signAsync({ sub: memberA.userId, email: memberA.user.email, role: 'ADMIN', tenantId: tenantA });

  // Tenant B with its own admin (Tenant, User and Membership are global).
  const b = await prisma.tenant.create({ data: { name: `Isolation test ${run}`, slug: `iso-${run}` } });
  tenantB = b.id;
  const userB = await prisma.user.create({
    data: { email: `iso-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId: tenantB, role: 'ADMIN' } } },
  });
  adminB = userB.id;
  tokenB = await jwt.signAsync({ sub: userB.id, email: userB.email, role: 'ADMIN', tenantId: tenantB });

  // Tenant B's records, created through the API with B's token.
  ids.boat = await create('/boats', { name: `Iso boat ${run}`, capacity: 8, registrationNumber: `ISO-${run}` });
  ids.site = await create('/dive-sites', SITE);
  ids.customer = await create('/customers', {
    email: `iso-customer-${run}@example.test`,
    firstName: 'Iso',
    lastName: 'Customer',
    country: 'ES',
  });
  ids.equipment = await create('/equipment', {
    type: 'BCD',
    brand: 'Iso',
    serialNumber: `ISO-${run}`,
    purchaseDate: '2026-01-01',
    purchaseCost: 100,
  });
  ids.partner = await create('/partners', {
    name: `Iso partner ${run}`,
    companyName: 'Iso SL',
    contactEmail: `iso-partner-${run}@example.test`,
    commissionRate: 10,
  });
  ids.trip = await create('/trips', { date: '2030-06-01', timeSlot: 'MORNING', boatId: ids.boat });
  ids.booking = await create('/bookings', {
    customerId: ids.customer,
    boatId: ids.boat,
    activityType: 'FUN_DIVE',
    date: '2030-06-01',
    timeSlot: 'MORNING',
    participantCount: 1,
  });
  ids.breach = await create('/breaches', {
    title: `Iso breach ${run}`,
    detectedAt: new Date(Date.now() - 3_600_000).toISOString(),
    severity: 'LOW',
    description: 'x',
    affectedDataTypes: [],
  });
  ids.staff = await create('/staff', {
    userId: adminB,
    firstName: 'Iso',
    lastName: 'Staff',
    phone: '+34 600 000 000',
    type: 'GUIDE',
    hireDate: '2026-01-01',
  });
  // An invoice with items: its items are a nested create, which must get
  // tenant B as well.
  ids.invoice = await create('/billing', {
    bookingId: ids.booking,
    customerId: ids.customer,
    subtotal: 45,
    tax: 3.15,
    total: 48.15,
    dueDate: '2030-06-30',
    items: [{ description: 'Fun Dive', quantity: 1, unitPrice: 45, total: 45, type: 'activity' }],
  });
  const settings = await call('PUT', '/settings', tokenB, { name: `Iso center ${run}` });
  if (settings.status !== 200) throw new Error(`PUT /settings as tenant B → ${settings.status}`);
  ids.expense = await create('/financial/expenses', {
    date: '2026-10-01',
    category: 'OTHER',
    description: `Iso expense ${run}`,
    amount: 10,
  });
}, 60_000);

// Cleanup crosses tenants: unscoped, which row-level security lets through.
afterAll(() =>
  runUnscoped(async () => {
  if (prisma && tenantB) {
    // Every row of tenant B, children before parents: retried until the
    // foreign keys allow each delete.
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tenantId'`;
    for (let pass = 0; pass < 10; pass++) {
      let left = 0;
      for (const { table_name } of tables) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE "tenantId" = $1`, tenantB);
        } catch {
          left++;
        }
      }
      if (left === 0) break;
    }
    await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
    await prisma.tenant.delete({ where: { id: tenantB } });
  }
  await app?.close();
  }),
);

const LISTS = [
  'boats',
  'dive-sites',
  'customers',
  'equipment',
  'partners',
  'trips?from=2030-06-01&to=2030-06-01',
  'bookings',
  'breaches',
  'staff',
  'billing',
];
const RECORDS: [string, string][] = [
  ['boats', 'boat'],
  ['dive-sites', 'site'],
  ['customers', 'customer'],
  ['equipment', 'equipment'],
  ['partners', 'partner'],
  ['trips', 'trip'],
  ['bookings', 'booking'],
  ['breaches', 'breach'],
  ['staff', 'staff'],
  ['billing', 'invoice'],
];

describe('tenant isolation', () => {
  it.each(LISTS)("tenant A's /%s does not list tenant B's records", async (path) => {
    const { status, data } = await call('GET', `/${path}`, tokenA);
    expect(status).toBe(200);
    const found = (data as { id: string }[]).map((r) => r.id);
    expect(found.some((id) => Object.values(ids).includes(id))).toBe(false);
  });

  it.each(LISTS)("tenant B's /%s lists its own records", async (path) => {
    const { status, data } = await call('GET', `/${path}`, tokenB);
    expect(status).toBe(200);
    const found = (data as { id: string }[]).map((r) => r.id);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((id) => Object.values(ids).includes(id))).toBe(true);
  });

  it.each(RECORDS)('tenant A cannot read, change or delete B’s %s', async (path, key) => {
    const id = ids[key];
    expect((await call('GET', `/${path}/${id}`, tokenA)).status).toBe(404);
    expect((await call('PATCH', `/${path}/${id}`, tokenA, {})).status).toBe(404);
    expect((await call('DELETE', `/${path}/${id}`, tokenA)).status).toBe(404);
  });

  it("tenant A cannot book on B's boat or for B's customer", async () => {
    const { status } = await call('POST', '/bookings', tokenA, {
      customerId: ids.customer,
      boatId: ids.boat,
      activityType: 'FUN_DIVE',
      date: '2030-06-02',
      timeSlot: 'MORNING',
      participantCount: 1,
    });
    expect([400, 404]).toContain(status);
    const stillOne = await runUnscoped(() => prisma.booking.count({ where: { boatId: ids.boat } }));
    expect(stillOne).toBe(1);
  });

  it("tenant A's users list holds no account of tenant B", async () => {
    const { data } = await call('GET', '/users', tokenA);
    expect((data as { id: string }[]).some((u) => u.id === adminB)).toBe(false);
    expect((await call('GET', `/users/${adminB}`, tokenA)).status).toBe(404);
    expect((await call('POST', `/users/${adminB}/change-password`, tokenA, { password: 'Takeover123' })).status).toBe(404);
  });

  it("an expense of tenant B cannot be deleted from tenant A", async () => {
    expect((await call('DELETE', `/financial/expenses/${ids.expense}`, tokenA)).status).toBe(404);
  });

  it("nested creates (invoice items) belong to the parent's tenant", async () => {
    const items = await runUnscoped(() =>
      prisma.invoiceItem.findMany({ where: { invoiceId: ids.invoice }, select: { tenantId: true } }),
    );
    expect(items.length).toBe(1);
    expect(items.every((i) => i.tenantId === tenantB)).toBe(true);
  });

  it("tenant A's settings are its own", async () => {
    const { data } = await call('GET', '/settings', tokenA);
    expect((data as { name: string }).name).not.toBe(`Iso center ${run}`);
    const b = await call('GET', '/settings', tokenB);
    expect((b.data as { name: string }).name).toBe(`Iso center ${run}`);
  });

  it("tenant A's daily figures leave out tenant B's expenses", async () => {
    const { status, data } = await call('GET', '/financial/daily?date=2026-10-01', tokenA);
    expect(status).toBe(200);
    expect(JSON.stringify(data)).not.toContain(ids.expense);
    const b = await call('GET', '/financial/daily?date=2026-10-01', tokenB);
    expect(JSON.stringify(b.data)).toContain(ids.expense);
  });

  it("tenant A's stays hold no customer of tenant B", async () => {
    const { status, data } = await call('GET', '/stays', tokenA);
    expect(status).toBe(200);
    expect(JSON.stringify(data)).not.toContain(ids.customer);
  });

  it("a staff profile gives its account access to the tenant", async () => {
    const member = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: adminB, tenantId: tenantB } } });
    expect(member).not.toBeNull();
  });

  it('a header naming another tenant than the token is refused', async () => {
    const { status } = await call('GET', '/boats', tokenA, undefined, { 'X-Tenant-ID': tenantB });
    expect(status).toBe(403);
  });

  it('public routes serve the tenant named by X-Tenant-ID', async () => {
    const b = await call('GET', '/dive-sites', undefined, undefined, { 'X-Tenant-ID': tenantB });
    expect((b.data as { id: string }[]).map((s) => s.id)).toEqual([ids.site]);
    const a = await call('GET', '/dive-sites', undefined, undefined, { 'X-Tenant-ID': tenantA });
    expect((a.data as { id: string }[]).some((s) => s.id === ids.site)).toBe(false);
  });

  it('a public route without a tenant is refused once there are several tenants', async () => {
    const { status, data } = await call('GET', '/dive-sites');
    if (process.env.DCMS_APP_TENANT_FILTER === 'off') {
      // Row-level security alone (npm run test:e2e:rls): no error from the
      // app, but no tenant's rows either.
      expect([200, 400]).toContain(status);
      if (status === 200) expect(data).toEqual([]);
    } else {
      expect(status).toBe(400);
    }
  });

  it('an unknown tenant id is refused', async () => {
    const { status } = await call('GET', '/dive-sites', undefined, undefined, { 'X-Tenant-ID': randomUUID() });
    expect(status).toBe(404);
  });

  it("tenant B's staff guard refuses an account that is not a member", async () => {
    const jwt = app.get(JwtService);
    const memberA = await prisma.membership.findFirstOrThrow({
      where: { tenantId: tenantA, user: { isSuperadmin: false } },
      include: { user: true },
    });
    // A real account of tenant A (not a superadmin, who may enter any
    // tenant) with a token claiming tenant B.
    const forged = await jwt.signAsync({ sub: memberA.userId, email: memberA.user.email, role: memberA.user.role, tenantId: tenantB });
    expect((await call('GET', '/boats', forged)).status).toBe(403);
  });

  it('every foreign key between tenant tables is checked by a same-tenant trigger', async () => {
    const fks = await prisma.$queryRaw<{ child: string; col: string; parent: string }[]>`
      SELECT tc.table_name AS child, kcu.column_name AS col, ccu.table_name AS parent
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        AND ccu.table_name NOT IN ('User', 'Tenant') AND tc.table_name <> 'Membership'`;
    const triggers = await prisma.$queryRaw<{ tbl: string; args: string }[]>`
      SELECT c.relname AS tbl, encode(t.tgargs, 'escape') AS args
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      WHERE t.tgname LIKE '%_enforce_tenant'`;
    const covered = new Set(
      triggers.flatMap(({ tbl, args }) => {
        const parts = args.split('\\000').filter(Boolean);
        return parts.flatMap((p, i) => (i % 2 === 0 ? [`${tbl}.${p}->${parts[i + 1]}`] : []));
      }),
    );
    const missing = fks.map((f) => `${f.child}.${f.col}->${f.parent}`).filter((k) => !covered.has(k));
    expect(missing).toEqual([]);
    const tenantTables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tenantId' AND table_name NOT IN ('Membership', 'PlatformAuditLog', 'Invitation')`;
    const withTrigger = new Set(triggers.map((t) => t.tbl));
    expect(tenantTables.map((t) => t.table_name).filter((t) => !withTrigger.has(t))).toEqual([]);
  });
});
