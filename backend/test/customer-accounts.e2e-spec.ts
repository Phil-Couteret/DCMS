import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { seedTenantDefaults } from '../src/config/tenant-defaults.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runInTenant, runUnscoped } from '../src/tenant/tenant-context.js';

// Customer accounts are per company (tenant), shared by all its locations: a
// diver of one company is a separate customer, with a separate login, at
// another (docs/MULTITENANT_PLAN.md, decision 1.2). Staff logins stay global.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/customer-accounts.e2e-spec.ts

const run = randomUUID().slice(0, 8);
const mail = (who: string) => `ca-${who}-${run}@example.test`;

let app: INestApplication;
let prisma: PrismaService;
let base: string;
const co: Record<'a' | 'b', { id: string; slug: string; admin: string; boat: string }> = {} as never;
let staffEmail = '';

async function call(method: string, path: string, opts: { token?: string; slug?: string; body?: unknown } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(opts.body !== undefined && { 'Content-Type': 'application/json' }),
      ...(opts.token && { Authorization: `Bearer ${opts.token}` }),
      ...(opts.slug && { 'X-Tenant-Slug': opts.slug }),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function ok(method: string, path: string, opts: { token?: string; slug?: string; body?: unknown }) {
  const res = await call(method, path, opts);
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

const decode = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
const accounts = (email: string) =>
  prisma.user.findMany({ where: { email }, select: { id: true, tenantId: true, role: true }, orderBy: { createdAt: 'asc' } });

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  for (const key of ['a', 'b'] as const) {
    const slug = `ca-${key}-${run}`;
    const t = await prisma.tenant.create({ data: { name: `Company ${key} ${run}`, slug } });
    await runInTenant(t.id, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Company ${key}` })));
    const user = await prisma.user.create({
      data: { email: mail(`admin-${key}`), passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId: t.id, role: 'ADMIN' } } },
    });
    const admin = await jwt.signAsync({ sub: user.id, email: user.email, role: 'ADMIN', tenantId: t.id });
    const boat = (await ok('POST', '/boats', { token: admin, body: { name: `Boat ${key}`, capacity: 20, registrationNumber: `CA-${key}-${run}` } })).id;
    co[key] = { id: t.id, slug, admin, boat };
  }
  // A staff member of company A, with a staff login (global account).
  staffEmail = mail('staff');
  await ok('POST', '/users', { token: co.a.admin, body: { email: staffEmail, password: 'Staff-pass-1', name: 'Sam Staff', role: 'INSTRUCTOR' } });
}, 60_000);

afterAll(async () => {
  await runUnscoped(async () => {
    if (prisma) {
      const ids = Object.values(co).map((c) => c.id);
      const tables = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'tenantId' AND table_name <> 'User'`;
      for (let pass = 0; pass < 10; pass++) {
        let left = 0;
        for (const { table_name } of tables) {
          try {
            await prisma.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE "tenantId" = ANY($1::text[])`, ids);
          } catch {
            left++;
          }
        }
        if (left === 0) break;
      }
      await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
      await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
    }
  });
  await app?.close();
});

describe('one customer per company, shared by its locations', () => {
  it('a customer of one location is the company\'s customer at all of them', async () => {
    // Two locations of company A, a boat at each.
    const boats = [];
    for (const name of [`Caleta ${run}`, `Playitas ${run}`]) {
      const loc = await ok('POST', '/locations', { token: co.a.admin, body: { name, type: 'DIVING' } });
      const boat = await ok('POST', '/boats', {
        token: co.a.admin,
        body: { name: `${name} boat`, capacity: 8, registrationNumber: `L-${name}`.replace(/\s/g, ''), locationId: loc.id },
      });
      boats.push({ boat: boat.id, location: loc.id });
    }
    const customer = await ok('POST', '/customers', { token: co.a.admin, body: { email: mail('loc'), firstName: 'Lou', lastName: 'Loc', country: 'ES' } });
    for (const { boat, location } of boats) {
      const b = await ok('POST', '/bookings', {
        token: co.a.admin,
        body: { customerId: customer.id, boatId: boat, activityType: 'FUN_DIVE', date: '2030-05-05', timeSlot: 'MORNING', participantCount: 1 },
      });
      expect(b.customerId).toBe(customer.id);
      const row = await runInTenant(co.a.id, () => prisma.booking.findUniqueOrThrow({ where: { id: b.id }, select: { locationId: true } }));
      expect(row.locationId).toBe(location);
    }
    // One account, belonging to company A.
    expect(await accounts(mail('loc'))).toEqual([{ id: customer.userId, tenantId: co.a.id, role: 'CUSTOMER' }]);
    expect((await call('POST', '/customers', { token: co.a.admin, body: { email: mail('loc'), firstName: 'L', lastName: 'L', country: 'ES' } })).status).toBe(409);
  });
});

describe('another company has a separate customer and account', () => {
  it('the same email becomes a separate customer, on a separate account, at company B', async () => {
    const email = mail('both');
    const a = await ok('POST', '/customers', { token: co.a.admin, body: { email, firstName: 'Bo', lastName: 'Both', country: 'ES' } });
    const b = await ok('POST', '/customers', { token: co.b.admin, body: { email, firstName: 'Bo', lastName: 'Both', country: 'FR' } });
    expect(b.userId).not.toBe(a.userId);
    expect((await accounts(email)).map((u) => u.tenantId).sort()).toEqual([co.a.id, co.b.id].sort());
    // Company A changing its customer's email leaves B's untouched.
    await ok('PATCH', `/customers/${a.id}`, { token: co.a.admin, body: { email: mail('both-new') } });
    expect((await ok('GET', `/customers/${b.id}`, { token: co.b.admin })).email).toBe(email);
    // ... and A may use an email that B's customer has, but not one of its own customers'.
    const other = await ok('POST', '/customers', { token: co.a.admin, body: { email: mail('other'), firstName: 'O', lastName: 'O', country: 'ES' } });
    expect((await call('PATCH', `/customers/${other.id}`, { token: co.a.admin, body: { email: mail('both-new') } })).status).toBe(409);
    await ok('PATCH', `/customers/${other.id}`, { token: co.a.admin, body: { email } });
  });

  it('guest bookings reuse the company\'s customer, and start a new one at another company', async () => {
    const guest = (slug: string, firstName: string) =>
      ok('POST', '/bookings/guest', {
        slug,
        body: {
          firstName, lastName: 'Guest', email: mail('guest'), phone: '+34 600', country: 'ES', language: 'EN',
          activityType: 'SNORKELING', timeSlot: 'MORNING', date: '2030-06-06', participantCount: 1,
        },
      });
    const customerOf = async (tenantId: string, bookingId: string) =>
      (await runInTenant(tenantId, () => prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, select: { customerId: true } }))).customerId;
    const first = await customerOf(co.a.id, (await guest(co.a.slug, 'Gina')).bookingId);
    const again = await customerOf(co.a.id, (await guest(co.a.slug, 'Changed')).bookingId);
    expect(again).toBe(first);
    const atB = await customerOf(co.b.id, (await guest(co.b.slug, 'Gina')).bookingId);
    expect(atB).not.toBe(first);
    expect((await accounts(mail('guest'))).map((u) => u.tenantId).sort()).toEqual([co.a.id, co.b.id].sort());
  });
});

describe('customer sign-up and sign-in on a company\'s site', () => {
  it('registers a separate login per company, each with its own password', async () => {
    const email = mail('diver');
    const atA = await ok('POST', '/auth/register', { slug: co.a.slug, body: { email, password: 'Password-A1', name: 'Di' } });
    expect(decode(atA.accessToken)).toMatchObject({ role: 'CUSTOMER', tenantId: co.a.id });
    expect((await call('POST', '/auth/register', { slug: co.a.slug, body: { email, password: 'Password-A2' } })).status).toBe(409);
    const atB = await ok('POST', '/auth/register', { slug: co.b.slug, body: { email, password: 'Password-B1' } });
    expect(decode(atB.accessToken)).toMatchObject({ role: 'CUSTOMER', tenantId: co.b.id });

    const login = (slug: string, password: string) => call('POST', '/auth/login', { slug, body: { email, password } });
    expect(decode((await login(co.a.slug, 'Password-A1')).data.accessToken).tenantId).toBe(co.a.id);
    expect((await login(co.a.slug, 'Password-B1')).status).toBe(401);
    expect(decode((await login(co.b.slug, 'Password-B1')).data.accessToken).tenantId).toBe(co.b.id);
    // Without a center, there is no customer login.
    expect((await call('POST', '/auth/login', { body: { email, password: 'Password-A1' } })).status).toBe(401);
  });

  it("staff keep their staff login; their customer profile at their own center uses it", async () => {
    // At company A (where they work), adding them as a customer links the staff login.
    const own = await ok('POST', '/customers', { token: co.a.admin, body: { email: staffEmail, firstName: 'Sam', lastName: 'Staff', country: 'ES' } });
    const [staffAccount] = await accounts(staffEmail);
    expect(own.userId).toBe(staffAccount.id);
    expect(staffAccount.tenantId).toBeNull();
    // At company B they are a customer like any other: a separate account.
    const atB = await ok('POST', '/customers', { token: co.b.admin, body: { email: staffEmail, firstName: 'Sam', lastName: 'Staff', country: 'ES' } });
    expect(atB.userId).not.toBe(staffAccount.id);

    // Signing in: the staff login by default, the customer profile when the site asks for it.
    const asStaff = await ok('POST', '/auth/login', { slug: co.a.slug, body: { email: staffEmail, password: 'Staff-pass-1' } });
    expect(decode(asStaff.accessToken)).toMatchObject({ role: 'INSTRUCTOR', tenantId: co.a.id });
    const asCustomer = await ok('POST', '/auth/login', { slug: co.a.slug, body: { email: staffEmail, password: 'Staff-pass-1', account: 'customer' } });
    expect(decode(asCustomer.accessToken)).toMatchObject({ role: 'CUSTOMER', tenantId: co.a.id });
    // At B the staff password is not the customer account's.
    expect((await call('POST', '/auth/login', { slug: co.b.slug, body: { email: staffEmail, password: 'Staff-pass-1', account: 'customer' } })).status).toBe(401);
  });

  it('a customer email does not stop a staff login with that email', async () => {
    const email = mail('both');
    const made = await ok('POST', '/users', { token: co.b.admin, body: { email, password: 'Staff-pass-2', name: 'Now Staff', role: 'INSTRUCTOR' } });
    expect(made.existingAccount).toBe(false);
    const all = await accounts(email);
    expect(all.filter((u) => u.tenantId === null)).toHaveLength(1);
    expect(all.filter((u) => u.tenantId !== null).length).toBeGreaterThan(0);
  });

  it('the database refuses a customer on another company\'s customer account', async () => {
    const [aAccount] = (await accounts(mail('loc'))).filter((u) => u.tenantId === co.a.id);
    await expect(
      runInTenant(co.b.id, () => prisma.customer.create({ data: { userId: aAccount.id, firstName: 'X', lastName: 'Y', country: 'ES' } })),
    ).rejects.toThrow(/own tenant/);
  });
});
