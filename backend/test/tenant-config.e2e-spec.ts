import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { centerToday } from '../src/financial/center-day.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { nextNumber } from '../src/tenant/numbering.js';
import { runInTenant } from '../src/tenant/tenant-context.js';

// Per-tenant configuration (docs/MULTITENANT_PLAN.md, step 3): a new
// tenant's default settings and prices, its own invoice series and prefix,
// its currency and its time zone. Creates two tenants through the
// superadmin API and removes them again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/tenant-config.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let superToken: string;
const tenants: Record<'e' | 'f', { id: string; token: string }> = {} as never;

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

async function ok(method: string, path: string, token: string, body?: unknown) {
  const res = await call(method, path, token, body);
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

// An invoice for a new booking of the tenant's customer.
async function invoice(token: string, customerId: string, boatId: string) {
  const booking = await ok('POST', '/bookings', token, {
    customerId,
    boatId,
    activityType: 'FUN_DIVE',
    date: '2030-06-01',
    timeSlot: 'MORNING',
    participantCount: 1,
  });
  return ok('POST', '/billing', token, {
    bookingId: booking.id,
    customerId,
    subtotal: 45,
    tax: 0,
    total: 45,
    dueDate: '2030-06-30',
    items: [{ description: 'Fun Dive', quantity: 1, unitPrice: 45, total: 45, type: 'activity' }],
  }) as Promise<{ invoiceNumber: string; currency: string }>;
}

async function fixtures(token: string, tag: string) {
  const boat = await ok('POST', '/boats', token, { name: `Cfg ${tag}`, capacity: 12, registrationNumber: `CFG-${tag}-${run}` });
  const customer = await ok('POST', '/customers', token, {
    email: `cfg-${tag}-${run}@example.test`,
    firstName: 'Cfg',
    lastName: tag,
    country: 'ES',
  });
  return { boatId: boat.id as string, customerId: customer.id as string };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  const user = await prisma.user.create({
    data: { email: `cfg-super-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', isSuperadmin: true },
  });
  superToken = await jwt.signAsync({ sub: user.id, email: user.email, role: 'SUPERADMIN', tenantId: null, isSuperadmin: true });
  // E keeps the platform defaults; F is a mainland center in another currency.
  for (const [key, extra] of [
    ['e', {}],
    ['f', { timeZone: 'Europe/Madrid', currency: 'GBP', defaultLanguage: 'ES', taxName: 'IVA', taxRate: 21 }],
  ] as const) {
    const created = await ok('POST', '/superadmin/tenants', superToken, { name: `Cfg ${key} ${run}`, slug: `cfg-${key}-${run}`, ...extra });
    const entered = await ok('POST', '/auth/switch-tenant', superToken, { tenantId: created.id });
    tenants[key] = { id: created.id, token: entered.accessToken };
  }
}, 60_000);

afterAll(async () => {
  if (prisma) {
    const ids = Object.values(tenants).map((t) => t.id);
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tenantId'`;
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
  await app?.close();
});

describe('a new tenant', () => {
  it('starts with its settings and the default price list', async () => {
    const e = await ok('GET', '/settings', tenants.e.token);
    expect(e).toMatchObject({ name: `Cfg e ${run}`, timeZone: 'Atlantic/Canary', currency: 'EUR', taxName: 'IGIC', invoicePrefix: 'INV' });
    const f = await ok('GET', '/settings', tenants.f.token);
    expect(f).toMatchObject({ timeZone: 'Europe/Madrid', currency: 'GBP', defaultLanguage: 'ES', taxName: 'IVA' });
    expect(Number(f.taxRate)).toBe(21);
    const pricing = await ok('GET', '/settings/pricing', tenants.f.token);
    expect(pricing).toMatchObject({ currency: 'GBP', taxRate: 21, activities: { funDive: 45 } });
    expect(pricing.funDiveTiers[0]).toMatchObject({ minDives: 1 });
  });

  it('serves its branding and currency on the public endpoints, without tax details', async () => {
    await ok('PUT', '/settings', tenants.f.token, {
      name: `Cfg f ${run}`,
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#0077B6',
      accentColor: '#00b4d8',
    });
    const { status, data } = await call('GET', '/center', undefined, undefined, { 'X-Tenant-ID': tenants.f.id });
    expect(status).toBe(200);
    expect(data).toMatchObject({ currency: 'GBP', logoUrl: 'https://example.com/logo.png', primaryColor: '#0077b6' });
    expect(data.taxRate).toBeUndefined();
    const pricing = await call('GET', '/pricing', undefined, undefined, { 'X-Tenant-ID': tenants.f.id });
    expect(pricing.data.currency).toBe('GBP');
  });

  it('gives new customers its default language', async () => {
    const customer = await ok('POST', '/customers', tenants.f.token, {
      email: `cfg-lang-${run}@example.test`,
      firstName: 'Lang',
      lastName: 'Default',
      country: 'ES',
    });
    expect(customer.language).toBe('ES');
  });
});

describe('settings permissions', () => {
  it('an instructor can edit the contact details but not the regional, branding or numbering settings', async () => {
    const jwt = app.get(JwtService);
    const user = await prisma.user.create({
      data: {
        email: `cfg-instructor-${run}@example.test`,
        passwordHash: 'x',
        role: 'INSTRUCTOR',
        memberships: { create: { tenantId: tenants.e.id, role: 'INSTRUCTOR' } },
      },
    });
    const token = await jwt.signAsync({ sub: user.id, email: user.email, role: 'INSTRUCTOR', tenantId: tenants.e.id });
    const current = await ok('GET', '/settings', token);
    const base = { name: current.name, phone: '+34 600 000 001' };
    expect((await call('PUT', '/settings', token, { ...base, currency: 'USD' })).status).toBe(403);
    expect((await call('PUT', '/settings', token, { ...base, invoicePrefix: 'X' })).status).toBe(403);
    // Sending the current values back is not a change.
    expect((await call('PUT', '/settings', token, { ...base, timeZone: current.timeZone, currency: current.currency })).status).toBe(200);
  });
});

describe('settings validation', () => {
  it.each([
    [{ timeZone: 'Mars/Olympus' }],
    [{ currency: 'XXQ' }],
    [{ invoicePrefix: 'inv-1' }],
    [{ logoUrl: 'http://example.com/logo.png' }],
    [{ primaryColor: 'blue' }],
  ])('refuses %j', async (field) => {
    const { status } = await call('PUT', '/settings', tenants.e.token, { name: `Cfg e ${run}`, ...field });
    expect(status).toBe(400);
  });
});

describe('numbering', () => {
  it('each tenant has its own gap-free series, with its own prefix and currency', async () => {
    await ok('PUT', '/settings', tenants.f.token, { name: `Cfg f ${run}`, invoicePrefix: 'CFGF' });
    const e = await fixtures(tenants.e.token, 'e');
    const f = await fixtures(tenants.f.token, 'f');
    const year = Number(centerToday('Atlantic/Canary').slice(0, 4));
    const yearF = Number(centerToday('Europe/Madrid').slice(0, 4));

    // Concurrent creates in E take consecutive numbers, none twice.
    const made = await Promise.all([1, 2, 3, 4, 5].map(() => invoice(tenants.e.token, e.customerId, e.boatId)));
    expect(made.map((i) => i.invoiceNumber).sort()).toEqual(
      [1, 2, 3, 4, 5].map((n) => `INV-${year}-${String(n).padStart(4, '0')}`),
    );
    expect(made[0].currency).toBe('EUR');

    const first = await invoice(tenants.f.token, f.customerId, f.boatId);
    expect(first.invoiceNumber).toBe(`CFGF-${yearF}-0001`);
    expect(first.currency).toBe('GBP');
  });

  it('a rolled-back number is given again', async () => {
    const take = () => prisma.$transaction((tx) => nextNumber(tx, 'DIVE_LOG', 2099));
    const n = await runInTenant(tenants.e.id, take);
    await expect(
      runInTenant(tenants.e.id, () =>
        prisma.$transaction(async (tx) => {
          await nextNumber(tx, 'DIVE_LOG', 2099);
          throw new Error('rollback');
        }),
      ),
    ).rejects.toThrow('rollback');
    expect(await runInTenant(tenants.e.id, take)).toBe(n + 1);
  });
});

describe('time zone', () => {
  // The same calendar date is today at UTC+14 and still in the future at
  // UTC−11, whatever the time is.
  const date = centerToday('Pacific/Kiritimati');

  it("closing a day follows the tenant's own calendar", async () => {
    await ok('PUT', '/settings', tenants.e.token, { name: `Cfg e ${run}`, timeZone: 'Pacific/Pago_Pago' });
    const early = await call('POST', `/financial/closed-days/${date}`, tenants.e.token);
    expect(early.status).toBe(400);
    expect(early.data.message).toMatch(/before it has started/);

    await ok('PUT', '/settings', tenants.e.token, { name: `Cfg e ${run}`, timeZone: 'Pacific/Kiritimati' });
    const closed = await call('POST', `/financial/closed-days/${date}`, tenants.e.token);
    expect(closed.status).toBe(201);
  });

  it("the token's /auth/me carries the tenant's time zone and currency", async () => {
    const me = await ok('GET', '/auth/me', tenants.f.token);
    expect(me.tenant).toMatchObject({ id: tenants.f.id, timeZone: 'Europe/Madrid', currency: 'GBP' });
  });
});
