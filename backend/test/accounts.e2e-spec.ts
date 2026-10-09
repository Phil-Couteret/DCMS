import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runUnscoped } from '../src/tenant/tenant-context.js';

// Accounts, memberships and the token (docs/MULTITENANT_PLAN.md, step 2):
// the "which center?" login, per-tenant roles, and the superadmin console.
// Creates its own tenants and accounts and removes them again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/accounts.e2e-spec.ts

const run = randomUUID().slice(0, 8);
const PASSWORD = 'Accounts-test-1';
const email = (who: string) => `acct-${who}-${run}@example.test`;

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tenantC: string;
let tenantD: string;
const created: string[] = [];

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

const claims = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;

// Sign-in is rate limited per client IP (10 per 15 minutes). The app trusts
// X-Forwarded-For here, as it does behind nginx, and each sign-in comes from
// its own address, so these tests are not counted together.
let clientIp = 0;
const nextClient = () => ({ 'X-Forwarded-For': `198.51.100.${++clientIp}` });

async function login(who: string) {
  return call('POST', '/auth/login', undefined, { email: email(who), password: PASSWORD }, nextClient());
}

async function tokenFor(who: string, tenantId: string | null) {
  const first = await login(who);
  if (first.data.accessToken) return first.data.accessToken as string;
  const { data } = await call('POST', '/auth/select-tenant', undefined, { selectionToken: first.data.selectionToken, tenantId });
  return data.accessToken as string;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);

  tenantC = (await prisma.tenant.create({ data: { name: `Acct C ${run}`, slug: `acct-c-${run}` } })).id;
  tenantD = (await prisma.tenant.create({ data: { name: `Acct D ${run}`, slug: `acct-d-${run}` } })).id;
  created.push(tenantC, tenantD);
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const user = (who: string, memberships: { tenantId: string; role: 'ADMIN' | 'INSTRUCTOR'; isActive?: boolean }[], isSuperadmin = false) =>
    prisma.user.create({
      data: { email: email(who), passwordHash, role: 'ADMIN', isSuperadmin, memberships: { create: memberships } },
    });
  // One center; two centers with different roles; one active and one
  // deactivated membership; a superadmin with no membership.
  await user('single', [{ tenantId: tenantC, role: 'ADMIN' }]);
  await user('multi', [
    { tenantId: tenantC, role: 'ADMIN' },
    { tenantId: tenantD, role: 'INSTRUCTOR' },
  ]);
  await user('suspended', [
    { tenantId: tenantC, role: 'INSTRUCTOR' },
    { tenantId: tenantD, role: 'ADMIN', isActive: false },
  ]);
  await user('super', [], true);
});

// Cleanup crosses tenants: unscoped, which row-level security lets through.
afterAll(() =>
  runUnscoped(async () => {
  if (prisma) {
    await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
    await prisma.platformAuditLog.deleteMany({ where: { tenantId: { in: created } } });
    // A tenant created through the API comes with its settings, prices and
    // first location.
    for (const table of ['CenterSettings', 'ActivityPrice', 'EquipmentPrice', 'FunDiveTier', 'AddOnPrice', 'DivePack', 'Location']) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "tenantId" = ANY($1::text[])`, created);
    }
    await prisma.tenant.deleteMany({ where: { id: { in: created } } });
  }
  await app?.close();
  }),
);

describe('login and the token', () => {
  it('one membership: a token for that tenant at once', async () => {
    const { status, data } = await login('single');
    expect(status).toBe(200);
    expect(data.tenant).toMatchObject({ id: tenantC, slug: `acct-c-${run}` });
    expect(claims(data.accessToken)).toMatchObject({ tenantId: tenantC, tenantSlug: `acct-c-${run}`, role: 'ADMIN' });
  });

  it('several memberships: the login asks which center', async () => {
    const { status, data } = await login('multi');
    expect(status).toBe(200);
    expect(data.requiresTenantSelection).toBe(true);
    expect(data.accessToken).toBeUndefined();
    expect(data.platform).toBe(false);
    expect((data.tenants as { id: string; role: string }[]).map((t) => [t.id, t.role]).sort()).toEqual(
      [
        [tenantC, 'ADMIN'],
        [tenantD, 'INSTRUCTOR'],
      ].sort(),
    );
  });

  it('select-tenant issues a token with that tenant and its role', async () => {
    const { data: first } = await login('multi');
    const { status, data } = await call('POST', '/auth/select-tenant', undefined, {
      selectionToken: first.selectionToken,
      tenantId: tenantD,
    });
    expect(status).toBe(200);
    expect(claims(data.accessToken)).toMatchObject({ tenantId: tenantD, role: 'INSTRUCTOR' });
  });

  it('select-tenant refuses a center the account is not a member of', async () => {
    const { data: first } = await login('multi');
    const other = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
    const { status } = await call('POST', '/auth/select-tenant', undefined, {
      selectionToken: first.selectionToken,
      tenantId: other.id,
    });
    expect(status).toBe(403);
  });

  it('a selection token is not an access token', async () => {
    const { data: first } = await login('multi');
    expect((await call('GET', '/auth/me', first.selectionToken)).status).toBe(401);
    expect((await call('POST', '/auth/select-tenant', undefined, { selectionToken: 'nope', tenantId: tenantC })).status).toBe(401);
  });

  it('roles are per tenant: admin in one center, instructor in the other', async () => {
    expect((await call('GET', '/users', await tokenFor('multi', tenantC))).status).toBe(200);
    expect((await call('GET', '/users', await tokenFor('multi', tenantD))).status).toBe(403);
  });

  it('switch-tenant re-issues the token for another of the account\'s centers', async () => {
    const tokenC = await tokenFor('multi', tenantC);
    const list = await call('GET', '/auth/tenants', tokenC);
    expect((list.data.tenants as { id: string }[]).map((t) => t.id).sort()).toEqual([tenantC, tenantD].sort());
    const { status, data } = await call('POST', '/auth/switch-tenant', tokenC, { tenantId: tenantD });
    expect(status).toBe(200);
    expect(claims(data.accessToken).tenantId).toBe(tenantD);
    const me = await call('GET', '/auth/me', data.accessToken);
    expect(me.data).toMatchObject({ role: 'INSTRUCTOR', tenant: { id: tenantD } });
  });

  it('a deactivated membership grants nothing, at login or on a live token', async () => {
    // Only the active membership is left, so no "which center?".
    const { data } = await login('suspended');
    expect(data.tenant?.id).toBe(tenantC);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email('suspended') } });
    await prisma.membership.update({
      where: { userId_tenantId: { userId: user.id, tenantId: tenantC } },
      data: { isActive: false },
    });
    expect((await call('GET', '/boats', data.accessToken)).status).toBe(403);
    expect((await login('suspended')).status).toBe(401);
  });
});

describe('sign-in rate limit', () => {
  it('refuses the 11th attempt from one address within 15 minutes, not other addresses', async () => {
    const from = { 'X-Forwarded-For': '203.0.113.7' };
    const body = { email: email('single'), password: 'wrong-password' };
    for (let i = 0; i < 10; i++) expect((await call('POST', '/auth/login', undefined, body, from)).status).toBe(401);
    expect((await call('POST', '/auth/login', undefined, body, from)).status).toBe(429);
    expect((await call('POST', '/auth/login', undefined, body, { 'X-Forwarded-For': '203.0.113.8' })).status).toBe(401);
  });
});

describe('superadmin', () => {
  it('a superadmin without memberships signs in to the platform console', async () => {
    const { status, data } = await login('super');
    expect(status).toBe(200);
    expect(data.tenant).toBeNull();
    expect(claims(data.accessToken)).toMatchObject({ tenantId: null, role: 'SUPERADMIN', isSuperadmin: true });
  });

  it('a platform token reaches no tenant data, not even by naming a tenant', async () => {
    const token = await tokenFor('super', null);
    expect((await call('GET', '/boats', token)).status).toBe(403);
    expect((await call('GET', '/boats', token, undefined, { 'X-Tenant-ID': tenantC })).status).toBe(403);
    // Not the single-tenant fallback either: a customer route needs a tenant.
    expect((await call('GET', '/auth/me', token)).status).toBe(200);
  });

  it('only superadmins can use /superadmin', async () => {
    expect((await call('GET', '/superadmin/tenants', await tokenFor('single', tenantC))).status).toBe(403);
    expect((await call('GET', '/superadmin/tenants')).status).toBe(401);
    const { status, data } = await call('GET', '/superadmin/tenants', await tokenFor('super', null));
    expect(status).toBe(200);
    const c = (data as { id: string; counts: { staff: number } }[]).find((t) => t.id === tenantC);
    expect(c?.counts.staff).toBe(2); // single and multi; suspended was deactivated
  });

  it('creates, renames and deactivates a tenant, and audits it', async () => {
    const token = await tokenFor('super', null);
    const slug = `acct-new-${run}`;
    const made = await call('POST', '/superadmin/tenants', token, { name: 'New center', slug, plan: 'STARTER' });
    expect(made.status).toBe(201);
    created.push(made.data.tenant.id);
    expect((await call('POST', '/superadmin/tenants', token, { name: 'Dup', slug })).status).toBe(409);
    expect((await call('POST', '/superadmin/tenants', token, { name: 'Bad', slug: 'Not A Slug' })).status).toBe(400);

    const patched = await call('PATCH', `/superadmin/tenants/${made.data.tenant.id}`, token, { name: 'Renamed', isActive: false });
    expect(patched.status).toBe(200);
    expect(patched.data).toMatchObject({ name: 'Renamed', isActive: false });

    const log = await prisma.platformAuditLog.findMany({ where: { tenantId: made.data.tenant.id }, orderBy: { createdAt: 'asc' } });
    expect(log.map((l) => l.action)).toEqual(['tenant.create', 'tenant.update']);
    expect(log[1].details).toMatchObject({ name: { from: 'New center', to: 'Renamed' }, isActive: { from: true, to: false } });
  });

  it('a superadmin can enter any active tenant as its admin, and the entry is audited', async () => {
    const platform = await tokenFor('super', null);
    const { status, data } = await call('POST', '/auth/switch-tenant', platform, { tenantId: tenantD });
    expect(status).toBe(200);
    expect(claims(data.accessToken)).toMatchObject({ tenantId: tenantD, role: 'ADMIN' });
    expect((await call('GET', '/users', data.accessToken)).status).toBe(200);
    const entry = await prisma.platformAuditLog.findFirst({ where: { tenantId: tenantD, action: 'tenant.enter' } });
    expect(entry).not.toBeNull();
    // And back to the console.
    const back = await call('POST', '/auth/switch-tenant', data.accessToken, { tenantId: null });
    expect(claims(back.data.accessToken).tenantId).toBeNull();
  });

  it('a center admin cannot take over a superadmin account', async () => {
    const superUser = await prisma.user.findUniqueOrThrow({ where: { email: email('super') } });
    await prisma.membership.create({ data: { userId: superUser.id, tenantId: tenantC, role: 'INSTRUCTOR' } });
    const admin = await tokenFor('single', tenantC);
    const res = await call('POST', `/users/${superUser.id}/change-password`, admin, { password: 'Taken-over-1' });
    expect(res.status).toBe(400);
    expect((await call('DELETE', `/users/${superUser.id}`, admin)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: superUser.id } })).not.toBeNull();
  });

  it('stats count one tenant\'s bookings, customers and revenue', async () => {
    const token = await tokenFor('super', null);
    const { status, data } = await call('GET', `/superadmin/tenants/${tenantC}/stats`, token);
    expect(status).toBe(200);
    expect(data).toMatchObject({
      tenant: { id: tenantC },
      bookings: { total: 0, last30Days: 0, upcoming: 0 },
      customers: { total: 0, last30Days: 0 },
      revenue: { invoiced: '0.00', collected: '0.00', collectedLast30Days: '0.00' },
    });
    const real = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
    const def = await call('GET', `/superadmin/tenants/${real.id}/stats`, token);
    expect(def.status).toBe(200);
    expect(def.data.bookings.total).toBe(await prisma.$queryRaw<[{ n: bigint }]>`
      SELECT count(*) AS n FROM "Booking" WHERE "tenantId" = ${real.id}`.then(([r]) => Number(r.n)));
    expect((await call('GET', `/superadmin/tenants/${randomUUID()}/stats`, token)).status).toBe(404);
  });
});
