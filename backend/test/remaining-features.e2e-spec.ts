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

// Admin-only financial and partner data, dive packs and add-ons (prices,
// invoices, stays), and the quarterly declaration's entries. Creates a tenant
// and removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/remaining-features.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tenantId = '';
let admin = '';
let instructor = '';
let boatId = '';

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function ok(method: string, path: string, token: string, body?: unknown) {
  const res = await call(method, path, token, body);
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

const isoDay = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

let customerSeq = 0;
async function customer(customerType = 'LOCAL') {
  customerSeq++;
  return (await ok('POST', '/customers', admin, {
    email: `rest-c${customerSeq}-${run}@example.test`,
    firstName: 'Rae',
    lastName: `Diver${customerSeq}`,
    country: 'ES',
    customerType,
  })).id as string;
}

const booking = (customerId: string, extra: Record<string, unknown>) => ({
  customerId,
  boatId,
  activityType: 'FUN_DIVE',
  date: isoDay(1),
  timeSlot: 'MORNING',
  participantCount: 1,
  status: 'CONFIRMED',
  ...extra,
});

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  tenantId = (await prisma.tenant.create({ data: { name: `Rest ${run}`, slug: `rest-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Rest ${run}` })));
  const user = async (who: string, role: 'ADMIN' | 'INSTRUCTOR') => {
    const u = await prisma.user.create({
      data: { email: `rest-${who}-${run}@example.test`, passwordHash: 'x', role, memberships: { create: { tenantId, role } } },
    });
    return jwt.signAsync({ sub: u.id, email: u.email, role, tenantId });
  };
  admin = await user('admin', 'ADMIN');
  instructor = await user('instructor', 'INSTRUCTOR');
  boatId = (await ok('POST', '/boats', admin, { name: 'Rest', capacity: 40, registrationNumber: `R-${run}` })).id;
}, 60_000);

afterAll(async () => {
  await runUnscoped(async () => {
    if (prisma && tenantId) {
      const tables = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'tenantId'`;
      for (let pass = 0; pass < 10; pass++) {
        let left = 0;
        for (const { table_name } of tables) {
          try {
            await prisma.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE "tenantId" = $1`, tenantId);
          } catch {
            left++;
          }
        }
        if (left === 0) break;
      }
      await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
  });
  await app?.close();
});

describe('admin-only areas', () => {
  it('financial data and partner records are for admins; instructors get partner names only', async () => {
    const { partner } = await ok('POST', '/partners', admin, {
      name: `Agency ${run}`,
      companyName: 'Agency S.L.',
      contactEmail: `agency-${run}@example.test`,
      commissionRate: 10,
    });
    for (const path of [
      `/financial/daily?date=${isoDay(0)}`,
      '/financial/tax-declaration?year=2026&quarter=3',
      '/financial/closed-days',
      '/partner-invoices',
      `/partners/${partner.id}`,
    ]) {
      expect([path, (await call('GET', path, instructor)).status]).toEqual([path, 403]);
    }
    expect((await call('POST', '/partners', instructor, { name: 'X' })).status).toBe(403);
    const forInstructor = await ok('GET', '/partners', instructor);
    expect(forInstructor).toEqual([{ id: partner.id, name: `Agency ${run}`, isActive: true }]);
    const forAdmin = await ok('GET', '/partners', admin);
    expect(forAdmin[0]).toHaveProperty('apiKey');
    expect(forAdmin[0]).toHaveProperty('outstanding');
  });
});

describe('dive packs and add-on prices', () => {
  it('start from the defaults, are saved with the price list, and kept when left out', async () => {
    const pricing = await ok('GET', '/settings/pricing', admin);
    expect(pricing.addOns).toEqual({ nightDive: 20, personalInstructor: 100, transfer: 15 });
    expect(pricing.divePacks).toEqual([
      { diveCount: 5, price: 200 },
      { diveCount: 10, price: 380 },
    ]);
    const list = { activities: pricing.activities, equipment: pricing.equipment, funDiveTiers: pricing.funDiveTiers };
    expect((await call('PUT', '/settings/pricing', admin, { ...list, divePacks: [{ diveCount: 4, price: 1 }, { diveCount: 4, price: 2 }] })).status).toBe(400);
    expect((await call('PUT', '/settings/pricing', admin, { ...list, divePacks: [{ diveCount: 1, price: 1 }] })).status).toBe(400);
    expect((await call('PUT', '/settings/pricing', instructor, list)).status).toBe(403);
    const saved = await ok('PUT', '/settings/pricing', admin, {
      ...list,
      addOns: { nightDive: 25, personalInstructor: 90 },
      divePacks: [{ diveCount: 10, price: 370 }, { diveCount: 3, price: 120 }],
    });
    // The transfer, left out, keeps its price.
    expect(saved.addOns).toEqual({ nightDive: 25, personalInstructor: 90, transfer: 15 });
    expect(saved.divePacks).toEqual([
      { diveCount: 3, price: 120 },
      { diveCount: 10, price: 370 },
    ]);
    // Left out: unchanged.
    const again = await ok('PUT', '/settings/pricing', admin, list);
    expect(again.addOns).toEqual(saved.addOns);
    expect(again.divePacks).toEqual(saved.divePacks);
    // The public price list shows them.
    const pub = await ok('GET', '/pricing', admin);
    expect(pub).toMatchObject({ addOns: saved.addOns, divePacks: saved.divePacks });
    expect(pub.funDiveTiers).toBeUndefined();
  });
});

describe('booking add-ons', () => {
  it('are validated, stored, and billed: night dive per diver, instructor once, outside a bono', async () => {
    const cust = await customer();
    expect((await call('POST', '/bookings', admin, booking(cust, { addOns: ['SPA'] }))).status).toBe(400);
    expect((await call('POST', '/bookings', admin, booking(cust, { addOns: ['NIGHT_DIVE', 'NIGHT_DIVE'] }))).status).toBe(400);
    const bono = await ok('POST', '/bonos', admin, {
      code: `rest-${run}`, type: 'PERCENTAGE', discountValue: 50, description: 'Half', validFrom: '2026-01-01',
    });
    const b = await ok('POST', '/bookings', instructor, booking(cust, {
      date: '2030-03-03', timeSlot: 'NIGHT', participantCount: 2, addOns: ['NIGHT_DIVE', 'PERSONAL_INSTRUCTOR'], bonoCode: bono.code,
    }));
    expect(b.addOns).toEqual(['NIGHT_DIVE', 'PERSONAL_INSTRUCTOR']);
    const inv = await ok('POST', `/billing/from-booking/${b.id}`, admin);
    const lines = inv.items.map((i: { description: string; quantity: number; total: string; type: string }) => [i.description, i.quantity, Number(i.total), i.type]);
    const { addOns } = await ok('GET', '/settings/pricing', admin);
    expect(lines).toContainEqual(['Night dive surcharge', 2, 2 * addOns.nightDive, 'addon']);
    expect(lines).toContainEqual(['Personal instructor', 1, addOns.personalInstructor, 'addon']);
    const activity = Number(inv.items.find((i: { type: string }) => i.type === 'activity').total);
    expect(Number(inv.discount)).toBeCloseTo(activity / 2);
    // Removing them on an edit.
    expect((await ok('PATCH', `/bookings/${b.id}`, admin, { addOns: [] })).addOns).toEqual([]);
  });
});

describe('billing a stay with a dive pack', () => {
  it('is offered when the fun dives match a pack, and replaces their stay rate on the invoice', async () => {
    await ok('PUT', '/settings/pricing', admin, {
      ...(({ activities, equipment, funDiveTiers }) => ({ activities, equipment, funDiveTiers }))(await ok('GET', '/settings/pricing', admin)),
      divePacks: [{ diveCount: 3, price: 99 }],
    });
    const cust = await customer('TOURIST');
    await ok('POST', '/bookings', admin, booking(cust, { date: isoDay(1), numberOfDives: 2 }));
    await ok('POST', '/bookings', admin, booking(cust, { date: isoDay(2), numberOfDives: 1, addOns: ['NIGHT_DIVE'], timeSlot: 'NIGHT' }));
    await ok('POST', '/bookings', admin, booking(cust, { date: isoDay(2), activityType: 'SNORKELING' }));

    const stay = await ok('GET', `/stays/customer/${cust}`, admin);
    expect(stay.pack).toMatchObject({ diveCount: 3, price: '99.00', divers: 1, total: '99.00' });
    expect(Number(stay.pack.totals.bookings)).toBeLessThan(Number(stay.totals.bookings));
    const night = stay.bookings.find((b: { addOns: unknown[] }) => b.addOns.length > 0);
    expect(night.addOns[0].description).toBe('Night dive surcharge');

    const billed = await ok('POST', `/stays/customer/${cust}/bill`, admin, { usePack: true });
    const inv = await ok('GET', `/billing/${billed.invoiceId}`, admin);
    const descriptions = inv.items.map((i: { description: string }) => i.description);
    expect(descriptions.filter((d: string) => d.startsWith('3-dive pack'))).toHaveLength(1);
    expect(descriptions.some((d: string) => d.startsWith('Fun Dive'))).toBe(false);
    expect(descriptions.some((d: string) => d.startsWith('Snorkeling'))).toBe(true);
    expect(descriptions.some((d: string) => d.startsWith('Night dive surcharge'))).toBe(true);
    expect(inv.total).toBe(stay.pack.totals.total);
  });

  it('is refused when no pack matches', async () => {
    const cust = await customer('TOURIST');
    await ok('POST', '/bookings', admin, booking(cust, { date: isoDay(3), numberOfDives: 2 }));
    expect((await ok('GET', `/stays/customer/${cust}`, admin)).pack).toBeNull();
    const res = await call('POST', `/stays/customer/${cust}/bill`, admin, { usePack: true });
    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/No dive pack/);
  });
});

describe('quarterly declaration', () => {
  it('lists each sale and purchase, with the sales base after discounts', async () => {
    const today = isoDay(0);
    const [year, month] = today.split('-').map(Number);
    const quarter = Math.floor((month - 1) / 3) + 1;
    await ok('POST', '/financial/expenses', admin, { date: today, category: 'GASOLINE', description: 'Boat fuel', amount: 107, tax: 7 });
    const d = await ok('GET', `/financial/tax-declaration?year=${year}&quarter=${quarter}`, admin);
    const purchase = d.entries.find((e: { kind: string }) => e.kind === 'PURCHASE');
    expect(purchase).toMatchObject({ date: today, net: '100.00', taxRate: '7.00', tax: '7.00', total: '107.00' });
    expect(purchase.description).toMatch(/gasoline.*Boat fuel/);
    const sales = d.entries.filter((e: { kind: string }) => e.kind === 'SALE');
    expect(sales).toHaveLength(d.sales.count);
    const netSum = sales.reduce((n: number, e: { net: string }) => n + Number(e.net), 0);
    expect(netSum).toBeCloseTo(Number(d.sales.base));
    expect(Number(d.sales.base)).toBeCloseTo(sales.reduce((n: number, e: { total: string; tax: string }) => n + Number(e.total) - Number(e.tax), 0));
  });
});
