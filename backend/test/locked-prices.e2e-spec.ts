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

// Prices are locked when a booking is made: a price list change between two
// bookings of the same stay bills each at its own prices, and the stay's fun
// dives at the volume rates in force when it began. Creates a tenant and
// removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/locked-prices.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tenantId = '';
let admin = '';
let boatId = '';

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${admin}`, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function ok(method: string, path: string, body?: unknown) {
  const res = await call(method, path, body);
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

const isoDay = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

let seq = 0;
const customer = async () =>
  (await ok('POST', '/customers', { email: `lp-${++seq}-${run}@example.test`, firstName: 'Lou', lastName: `Locked${seq}`, country: 'ES', customerType: 'TOURIST' })).id as string;

const booking = (customerId: string, extra: Record<string, unknown>) =>
  ok('POST', '/bookings', { customerId, boatId, activityType: 'FUN_DIVE', timeSlot: 'MORNING', participantCount: 1, status: 'CONFIRMED', ...extra });

// "January": everything dearer.
async function raisePrices() {
  const p = await ok('GET', '/settings/pricing');
  await ok('PUT', '/settings/pricing', {
    activities: { ...p.activities, snorkeling: 30 },
    equipment: { ...p.equipment, regulator: 14 },
    funDiveTiers: p.funDiveTiers.map((t: { tourist: number }) => ({ ...t, tourist: t.tourist + 4 })),
    addOns: { nightDive: 25, personalInstructor: 120 },
  });
}

const hire = JSON.stringify({ selectedEquipment: ['regulator'] });

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  tenantId = (await prisma.tenant.create({ data: { name: `Locked ${run}`, slug: `locked-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Locked ${run}` })));
  const u = await prisma.user.create({
    data: { email: `lp-admin-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId, role: 'ADMIN' } } },
  });
  admin = await jwt.signAsync({ sub: u.id, email: u.email, role: 'ADMIN', tenantId });
  boatId = (await ok('POST', '/boats', { name: 'Locked', capacity: 30, registrationNumber: `L-${run}` })).id;
}, 60_000);

afterAll(async () => {
  await runUnscoped(async () => {
    if (prisma && tenantId) {
      const tables = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'tenantId' AND table_name <> 'User'`;
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

describe('prices locked at booking time', () => {
  let stayCustomer = '';
  let soloBooking = '';

  it('a stay across a price change: each booking at its own prices, fun dives at the first rates', async () => {
    stayCustomer = await customer();
    const solo = await customer();
    // "December" (the seeded list): fun dives 46/44/42…, snorkeling 25, regulator 10, night dive 20.
    const dec = await booking(stayCustomer, { date: isoDay(1), numberOfDives: 2, notes: hire, addOns: ['NIGHT_DIVE'] });
    expect(dec).toMatchObject({ pricePerDiver: '45', equipmentPrice: '10', addOnPrices: { NIGHT_DIVE: 20, PERSONAL_INSTRUCTOR: 100 } });
    await booking(stayCustomer, { date: isoDay(2), activityType: 'SNORKELING' });
    soloBooking = (await booking(solo, { date: isoDay(40), activityType: 'SNORKELING' })).id;

    await raisePrices();

    // "January".
    await booking(stayCustomer, { date: isoDay(5), numberOfDives: 2, notes: hire, addOns: ['NIGHT_DIVE'] });
    await booking(stayCustomer, { date: isoDay(6), activityType: 'SNORKELING' });

    const stay = await ok('GET', `/stays/customer/${stayCustomer}`);
    expect(stay.totalDives).toBe(4);
    expect(stay.pricePerDive).toBe('44.00'); // December's 3+ tier; January's would be 48
    const lines = stay.bookings.map((b: { activityType: string; activityTotal: string; equipment: { total: string }[]; addOns: { total: string }[] }) => [
      b.activityType,
      b.activityTotal,
      b.equipment.map((e) => e.total),
      b.addOns.map((a) => a.total),
    ]);
    expect(lines).toEqual([
      ['FUN_DIVE', '88.00', ['10.00'], ['20.00']],
      ['SNORKELING', '25.00', [], []],
      ['FUN_DIVE', '88.00', ['14.00'], ['25.00']],
      ['SNORKELING', '30.00', [], []],
    ]);
    expect(stay.totals.bookings).toBe('300.00');
    expect(stay.priceChanges).toEqual(
      expect.arrayContaining([
        { kind: 'stayRate', locked: 44, current: 48 },
        { kind: 'activity', activityType: 'SNORKELING', locked: 25, current: 30 },
        { kind: 'equipment', bookings: 1 },
        { kind: 'addOn', addOn: 'NIGHT_DIVE', locked: 20, current: 25 },
      ]),
    );

    const billed = await ok('POST', `/stays/customer/${stayCustomer}/bill`, {});
    const invoice = await ok('GET', `/billing/${billed.invoiceId}`);
    expect(invoice.subtotal).toBe('300');
    expect(Number(invoice.total)).toBe(Number(stay.totals.total));
  });

  it('a booking invoiced on its own keeps its price', async () => {
    const invoice = await ok('POST', `/billing/from-booking/${soloBooking}`);
    expect(invoice.items[0]).toMatchObject({ unitPrice: '25', total: '25' });
  });

  it('an edit re-prices only what changed', async () => {
    const c = await customer();
    // Booked now, at the January prices.
    const b = await booking(c, { date: isoDay(10), activityType: 'SNORKELING', notes: hire });
    expect(b).toMatchObject({ pricePerDiver: '30', equipmentPrice: '14' });
    // Make prices change again, then edit: the new activity takes today's
    // price; the unchanged equipment keeps its locked one.
    const p = await ok('GET', '/settings/pricing');
    await ok('PUT', '/settings/pricing', {
      activities: { ...p.activities, discoverScuba: 70 },
      equipment: { ...p.equipment, regulator: 16 },
      funDiveTiers: p.funDiveTiers,
    });
    const edited = await ok('PATCH', `/bookings/${b.id}`, { activityType: 'DISCOVER_SCUBA' });
    expect(edited).toMatchObject({ pricePerDiver: '70', equipmentPrice: '14' });
    // A different equipment set is priced today.
    const reequipped = await ok('PATCH', `/bookings/${b.id}`, { notes: JSON.stringify({ selectedEquipment: ['regulator', 'bcd:M'] }) });
    expect(reequipped.equipmentPrice).toBe('26'); // regulator 16 + BCD 10
  });

  it('bookings from before prices were locked use the current price list, without a warning', async () => {
    const c = await customer();
    const b = await booking(c, { date: isoDay(12), activityType: 'SNORKELING' });
    await runInTenant(tenantId, () =>
      prisma.booking.update({ where: { id: b.id }, data: { pricePerDiver: null, equipmentPrice: null, addOnPrices: undefined, funDiveTiers: undefined } }),
    );
    await runInTenant(tenantId, () => prisma.$executeRaw`UPDATE "Booking" SET "addOnPrices" = NULL, "funDiveTiers" = NULL WHERE id = ${b.id}`);
    const stay = await ok('GET', `/stays/customer/${c}`);
    expect(stay.bookings[0].activityTotal).toBe('30.00'); // the current price
    expect(stay.priceChanges).toEqual([]);
  });
});
