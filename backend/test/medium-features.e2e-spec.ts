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

// Breach details and customer notification, the dashboard's admin charts,
// equipment CSV import, boats needed per day, and the 10:15 shore session.
// Creates a tenant and removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/medium-features.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tenantId = '';
let admin = '';
let boatId = '';
let instructor = '';

async function call(method: string, path: string, body?: unknown, token = admin) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
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
  (await ok('POST', '/customers', { ...extra, email: `mf-${++seq}-${run}@example.test`, firstName: 'Mia', lastName: `Medium${seq}`, country: 'ES', customerType: 'TOURIST' })).id as string;

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
  tenantId = (await prisma.tenant.create({ data: { name: `Medium ${run}`, slug: `medium-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Medium ${run}` })));
  const u = await prisma.user.create({
    data: { email: `mf-admin-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId, role: 'ADMIN' } } },
  });
  admin = await jwt.signAsync({ sub: u.id, email: u.email, role: 'ADMIN', tenantId });
  const i = await prisma.user.create({
    data: { email: `mf-inst-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId, role: 'INSTRUCTOR' } } },
  });
  instructor = await jwt.signAsync({ sub: i.id, email: i.email, role: 'INSTRUCTOR', tenantId });
  boatId = (await ok('POST', '/boats', { name: 'Big', capacity: 12, registrationNumber: `M-${run}` })).id;
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

const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * 3_600_000).toISOString();

describe('breach details', () => {
  it('records and edits the details, and the customer notification once', async () => {
    const created = await ok('POST', '/breaches', {
      title: `Lost laptop ${run}`,
      detectedAt: iso(-24),
      severity: 'HIGH',
      description: 'A laptop with the booking export was stolen.',
      affectedDataTypes: ['customer_data'],
      breachType: 'data_loss',
      occurredAt: iso(-30),
      rootCause: '  Laptop left in a car  ',
      containmentMeasures: 'Remote wipe',
    });
    expect(created).toMatchObject({
      breachType: 'data_loss',
      rootCause: 'Laptop left in a car',
      containmentMeasures: 'Remote wipe',
      mitigationMeasures: null,
      customersNotified: false,
      customersNotifiedAt: null,
      customersNotifiedMethod: null,
    });
    expect(new Date(created.occurredAt).getTime()).toBeLessThan(new Date(created.detectedAt).getTime());

    // It cannot have happened after it was found, nor be an unknown kind.
    expect((await call('PATCH', `/breaches/${created.id}`, { occurredAt: iso(-1) })).status).toBe(400);
    expect((await call('PATCH', `/breaches/${created.id}`, { breachType: 'aliens' })).status).toBe(400);
    const edited = await ok('PATCH', `/breaches/${created.id}`, { mitigationMeasures: 'Passwords reset', rootCause: null });
    expect(edited).toMatchObject({ mitigationMeasures: 'Passwords reset', rootCause: null, breachType: 'data_loss' });

    // The notification details go with Notify customers.
    expect((await call('PATCH', `/breaches/${created.id}`, { customersNotifiedMethod: 'email' })).status).toBe(400);
    expect((await call('POST', `/breaches/${created.id}/notify-customers`, { method: 'pigeon' })).status).toBe(400);
    expect((await call('POST', `/breaches/${created.id}/notify-customers`, { method: 'email', notifiedAt: iso(-48) })).status).toBe(400);
    const notified = await ok('POST', `/breaches/${created.id}/notify-customers`, { method: 'email' });
    expect(notified).toMatchObject({ customersNotified: true, customersNotifiedMethod: 'email' });
    expect(Date.now() - new Date(notified.customersNotifiedAt).getTime()).toBeLessThan(60_000);
    expect((await call('POST', `/breaches/${created.id}/notify-customers`, { method: 'letter' })).status).toBe(409);
    // Corrected by an edit.
    const corrected = await ok('PATCH', `/breaches/${created.id}`, { customersNotifiedMethod: 'letter', customersNotifiedAt: iso(-2) });
    expect(corrected.customersNotifiedMethod).toBe('letter');
  });
});

describe('dashboard charts', () => {
  it('admins get the booking trend, the month by activity and the top customers; instructors do not', async () => {
    const regular = await customer();
    const once = await customer();
    const today = isoDay(0);
    await booking(regular, { date: today, numberOfDives: 3, participantCount: 2, notes: hire });
    await booking(regular, { date: today, activityType: 'SNORKELING' });
    await booking(once, { date: today, numberOfDives: 1 });
    const cancelled = await booking(once, { date: today, numberOfDives: 9 });
    await ok('PATCH', `/bookings/${cancelled.id}`, { status: 'CANCELLED' });

    const overview = await ok('GET', '/dashboard/overview');
    expect(overview.bookingTrend).toHaveLength(30);
    expect(overview.bookingTrend[29]).toMatchObject({ date: today, bookings: 3, divers: 4 });
    // 2 divers × 3 dives at 45, 1 × 45, snorkeling 25; the regulator 10 (one set per booking).
    const value = Object.fromEntries(overview.valueByActivity.map((v: { activityType: string; amount: string }) => [v.activityType, v.amount]));
    expect(value).toEqual({ FUN_DIVE: '315.00', SNORKELING: '25.00', EXTRAS: '10.00' });
    // Dives this year, snorkeling and cancellations left out.
    expect(overview.topCustomers.slice(0, 2).map((c: { customer: { id: string }; dives: number }) => [c.customer.id, c.dives])).toEqual([
      [regular, 3],
      [once, 1],
    ]);

    const asInstructor = await call('GET', '/dashboard/overview', undefined, instructor);
    expect(asInstructor.status).toBe(200);
    expect(asInstructor.data).toMatchObject({ revenue: null, bookingTrend: null, valueByActivity: null, topCustomers: null });
  });
});

describe('equipment import', () => {
  const upload = (csv: string) => {
    const form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'equipment.csv');
    return call('POST', '/equipment/import', form);
  };

  it('imports valid rows, skips known serial numbers, and reports the rest by line', async () => {
    const serial = `REG-${run}`;
    const res = await upload(
      [
        'Type,Brand,Model,Size,Serial Number,Purchase Date,Purchase Cost,Condition',
        `Regulator,Apeks,XTX50,,${serial},15/03/2025,"450,50",good`,
        `BCD,Scubapro,Hydros,M,,2024-06-01,399,`,
        `Fins,Mares,,42,${serial},2024-06-01,80,`,
        `,Mares,,,,2024-06-01,80,`,
        `Wetsuit,Bare,,L,WS-${run},31/02/2024,abc,shiny`,
      ].join('\n'),
    );
    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(2);
    expect(res.data.skipped).toEqual([{ line: 4, reason: `serial number ${serial} is already on record` }]);
    expect(res.data.errors.map((e: { line: number }) => e.line)).toEqual([5, 6]);
    expect(res.data.errors[1].message).toMatch(/purchase date "31\/02\/2024" is not a date.*purchase cost "abc".*condition "SHINY"/);
    const items = (await ok('GET', '/equipment')) as { serialNumber: string | null; type: string; purchaseCost: string; condition: string }[];
    expect(items.find((i) => i.serialNumber === serial)).toMatchObject({ type: 'regulator', purchaseCost: '450.5', condition: 'GOOD' });
    // Again: everything is already there or wrong.
    expect((await upload(`type,brand,purchaseDate,purchaseCost,serialNumber\nregulator,Apeks,2025-03-15,450,${serial}`)).data).toMatchObject({ imported: 0 });
    expect((await upload('type,brand\nregulator,Apeks')).status).toBe(400);
  });
});

describe('boats needed', () => {
  it('counts the boats the confirmed boat divers need, and flags a slot the trips cannot seat', async () => {
    const small = (await ok('POST', '/boats', { name: 'Small', capacity: 8, registrationNumber: `S-${run}` })).id;
    const day = isoDay(9);
    const c = await customer();
    // 14 confirmed morning divers: the 12-place boat seats 10, so 2 boats.
    await booking(c, { date: day, participantCount: 6 });
    await booking(c, { date: day, participantCount: 8, boatId: small });
    // Pending ones and shore dives do not count.
    await booking(c, { date: day, participantCount: 3, status: 'PENDING' });
    const needs = async () => (await ok('GET', `/trips/boats-needed?from=${day}&to=${day}`)) as { date: string; boatsNeeded: number; short: boolean; slots: { timeSlot: string; divers: number; boatsNeeded: number; tripSeats: number; short: boolean }[] }[];
    const [first] = await needs();
    expect(first).toMatchObject({ date: day, boatsNeeded: 2, short: true });
    expect(first.slots).toEqual([expect.objectContaining({ timeSlot: 'MORNING', divers: 14, boatsNeeded: 2, trips: 0, tripSeats: 0, short: true })]);
    // Trips with seats for them all: 10 + 6.
    await ok('POST', '/trips', { date: day, timeSlot: 'MORNING', boatId });
    await ok('POST', '/trips', { date: day, timeSlot: 'MORNING', boatId: small });
    const [second] = await needs();
    expect(second.slots[0]).toMatchObject({ trips: 2, tripSeats: 16, short: false });
    expect(second.short).toBe(false);
    expect((await call('GET', `/trips/boats-needed?from=${day}&to=${isoDay(1)}`)).status).toBe(400);
  });
});

describe('the 10:15 shore session', () => {
  it('is a morning shore session for bookings and trips', async () => {
    const name = `Harbour ${run}`;
    const site = (
      await ok('POST', '/dive-sites', {
        ...Object.fromEntries(['nameEs', 'nameEn', 'nameDe', 'nameFr', 'descriptionEs', 'descriptionEn', 'descriptionDe', 'descriptionFr'].map((k) => [k, name])),
        latitude: 28.39,
        longitude: -13.86,
        depthMin: 2,
        depthMax: 6,
        requiredCertLevel: 0,
        difficultyLevel: 1,
        waterTempRange: {},
        marineLife: [],
        pointsOfInterest: [],
        bestSeason: [],
        facilities: [],
        travelTimeMinutes: 0,
        maxDiversPerTrip: 10,
        isShore: true,
      })
    ).id;
    const c = await customer();
    const b = await ok('POST', '/bookings', {
      customerId: c, activityType: 'DISCOVER_SCUBA', date: isoDay(11), timeSlot: 'MORNING', shoreTime: '10:15', siteId: site, participantCount: 1, status: 'CONFIRMED',
    });
    expect(b.shoreTime).toBe('10:15');
    const trip = await ok('GET', `/trips/${b.tripId}`);
    expect(trip).toMatchObject({ isShore: true, startTime: '10:15' });
    // Still on the 30-minute grid otherwise.
    const off = await call('POST', '/bookings', {
      customerId: c, activityType: 'DISCOVER_SCUBA', date: isoDay(11), timeSlot: 'MORNING', shoreTime: '10:20', siteId: site, participantCount: 1, status: 'CONFIRMED',
    });
    expect(off.status).toBe(400);
  });
});
