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

// Trip divers (equipment sizes on the trip, clear all), who pays an invoice
// (customer, partners, payment methods), the day's bookings and dive counts
// in the daily figures and closed days, and emailing a closed day's report.
// Creates a tenant and removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/trips-financial.e2e-spec.ts

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
const customer = async (extra: Record<string, unknown> = {}) =>
  (await ok('POST', '/customers', { ...extra, email: `tf-${++seq}-${run}@example.test`, firstName: 'Tina', lastName: `Trip${seq}`, country: 'ES', customerType: 'TOURIST' })).id as string;

const booking = (customerId: string, extra: Record<string, unknown>) =>
  ok('POST', '/bookings', { customerId, boatId, activityType: 'FUN_DIVE', timeSlot: 'MORNING', participantCount: 1, status: 'CONFIRMED', ...extra });

const hire = JSON.stringify({ selectedEquipment: ['regulator'] });

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  tenantId = (await prisma.tenant.create({ data: { name: `TripFin ${run}`, slug: `tripfin-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `TripFin ${run}` })));
  const u = await prisma.user.create({
    data: { email: `tf-admin-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId, role: 'ADMIN' } } },
  });
  admin = await jwt.signAsync({ sub: u.id, email: u.email, role: 'ADMIN', tenantId });
  boatId = (await ok('POST', '/boats', { name: 'Tripper', capacity: 30, registrationNumber: `T-${run}` })).id;
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

describe('trip divers', () => {
  it('the trip shows each diver\'s sizes; clear all takes every diver off', async () => {
    const a = await customer({ bcdSize: 'M', wetsuitSize: 'L', finsSize: '42', tankSize: '15L' });
    const b = await customer({ ownEquipment: true });
    const trip = await ok('POST', '/trips', { date: isoDay(4), timeSlot: 'MORNING', boatId });
    const ba = await booking(a, { date: isoDay(4), notes: hire });
    const bb = await booking(b, { date: isoDay(4) });
    for (const id of [ba.id, bb.id]) await ok('POST', `/trips/${trip.id}/bookings/${id}`, {});
    const detail = await ok('GET', `/trips/${trip.id}`);
    expect(detail.bookings.find((x: { id: string }) => x.id === ba.id).customer).toMatchObject({
      bcdSize: 'M',
      wetsuitSize: 'L',
      finsSize: '42',
      tankSize: '15L',
      ownEquipment: false,
    });
    expect(detail.bookings.find((x: { id: string }) => x.id === bb.id).customer.ownEquipment).toBe(true);

    const cleared = await ok('DELETE', `/trips/${trip.id}/bookings`);
    expect(cleared.bookings).toEqual([]);
    // The bookings stay, with no trip.
    expect((await ok('GET', `/bookings/${ba.id}`)).tripId).toBeNull();
    // A cancelled trip cannot be changed.
    await ok('POST', `/trips/${trip.id}/bookings/${ba.id}`, {});
    await ok('PATCH', `/trips/${trip.id}`, { status: 'CANCELLED' });
    expect((await call('DELETE', `/trips/${trip.id}/bookings`)).status).toBeGreaterThanOrEqual(400);
  });
});

describe('who pays an invoice', () => {
  it('lists the partners paying part of a stay and how the customer paid; the detail splits it', async () => {
    const { partner } = await ok('POST', '/partners', { name: `Agency ${run}`, companyName: `Agency ${run} SL`, contactEmail: `tf-p-${run}@example.test`, commissionRate: 10 });
    const c = await customer();
    // The partner pays the fun dives (2 × 45); the customer the snorkeling and the regulator.
    await booking(c, { date: isoDay(1), numberOfDives: 2, partnerId: partner.id, bookingSource: 'PARTNER', notes: hire });
    await booking(c, { date: isoDay(2), activityType: 'SNORKELING' });
    const billed = await ok('POST', `/stays/customer/${c}/bill`, {});
    await ok('POST', `/billing/${billed.invoiceId}/payments`, { amount: 5, method: 'CARD', status: 'SUCCEEDED' });
    await ok('POST', `/billing/${billed.invoiceId}/payments`, { amount: 5, method: 'CASH', status: 'SUCCEEDED' });

    const listed = (await ok('GET', '/billing')).find((i: { id: string }) => i.id === billed.invoiceId);
    expect(listed.partners).toEqual([{ id: partner.id, name: `Agency ${run}` }]);
    expect([...listed.paymentMethods].sort()).toEqual(['CARD', 'CASH']);

    const invoice = await ok('GET', `/billing/${billed.invoiceId}`);
    expect(invoice.subtotal).toBe('35'); // snorkeling 25 + regulator 10
    expect(invoice.partnerSplit).toEqual([
      {
        partner: { id: partner.id, name: `Agency ${run}` },
        total: '90.00',
        bookings: [expect.objectContaining({ activity: 'Fun Dive (2 dives)', total: '90.00', partnerInvoice: null })],
      },
    ]);

    // An invoice without partner bookings.
    const solo = await customer();
    const sb = await booking(solo, { date: isoDay(30), activityType: 'SNORKELING' });
    const own = await ok('POST', `/billing/from-booking/${sb.id}`);
    expect((await ok('GET', `/billing/${own.id}`)).partnerSplit).toEqual([]);
    expect((await ok('GET', '/billing')).find((i: { id: string }) => i.id === own.id)).toMatchObject({ partners: [], paymentMethods: [] });
  });
});

describe('daily figures', () => {
  it("counts the day's dives and lists its bookings with their value and billing", async () => {
    const day = isoDay(6);
    const c = await customer();
    const d = await customer();
    await booking(c, { date: day, numberOfDives: 2, participantCount: 2, notes: hire });
    await booking(d, { date: day, activityType: 'SNORKELING' });
    await booking(d, { date: day, activityType: 'OW_CERT' });
    const cancelled = await booking(c, { date: day, activityType: 'DISCOVER_SCUBA' });
    await ok('PATCH', `/bookings/${cancelled.id}`, { status: 'CANCELLED' });

    const daily = await ok('GET', `/financial/daily?date=${day}`);
    expect(daily.diveCounts).toEqual({
      funDives: { bookings: 1, divers: 2, dives: 4 },
      snorkeling: { bookings: 1, divers: 1, dives: 1 },
      discoverScuba: { bookings: 0, divers: 0, dives: 0 },
      courses: { bookings: 1, divers: 1, dives: 1 },
    });
    const fun = daily.bookings.find((b: { activityType: string }) => b.activityType === 'FUN_DIVE');
    // 2 divers × 2 dives at 45, plus the regulator (10).
    expect(fun).toMatchObject({ activity: 'Fun Dive (2 dives)', participantCount: 2, place: 'Tripper', amount: '190.00', billing: { kind: 'unbilled' } });
    expect(daily.bookings).toHaveLength(3);
  });

  it('a closed day keeps them, names who closed it, and its report can be emailed (when email is set up)', async () => {
    const day = isoDay(0);
    const c = await customer();
    await booking(c, { date: day, activityType: 'SNORKELING' });
    await ok('POST', `/financial/closed-days/${day}`);
    const closed = await ok('GET', `/financial/closed-days/${day}`);
    expect(closed.summary.diveCounts.snorkeling.bookings).toBeGreaterThanOrEqual(1);
    expect(closed.summary.bookings.length).toBeGreaterThanOrEqual(1);
    expect(closed).toHaveProperty('closedByName');
    expect(closed.closedBy).toBe(`tf-admin-${run}@example.test`);

    const html = '<!doctype html><html><body>Report</body></html>';
    expect((await call('POST', `/financial/closed-days/${day}/email`, { to: 'someone@else.test', html })).status).toBe(400);
    // The test server has no SMTP_URL: nothing can be sent.
    expect((await call('POST', `/financial/closed-days/${day}/email`, { to: 'me', html })).status).toBe(503);
  });
});
