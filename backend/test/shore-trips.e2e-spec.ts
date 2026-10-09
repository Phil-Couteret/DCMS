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

// Shore trips: bookings without a boat, on 30-minute shore sessions at a
// shore dive site (the original's "Mole" slots). Creates a tenant and
// removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/shore-trips.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tenantId = '';
let admin = '';
let boatId = '';
let shoreSiteId = '';
let reefSiteId = '';
let customerId = '';

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

const site = (name: string, isShore: boolean) => ({
  nameEs: name, nameEn: name, nameDe: name, nameFr: name,
  descriptionEs: '-', descriptionEn: '-', descriptionDe: '-', descriptionFr: '-',
  latitude: 28.39, longitude: -13.86, depthMin: 1, depthMax: isShore ? 6 : 20,
  requiredCertLevel: 0, difficultyLevel: 1, waterTempRange: { min: 18, max: 23 }, marineLife: [], pointsOfInterest: [],
  bestSeason: [], travelTimeMinutes: 0, maxDiversPerTrip: 10, facilities: [], isShore,
});

const shoreBooking = (extra: Record<string, unknown> = {}) => ({
  customerId, activityType: 'DISCOVER_SCUBA', date: '2030-04-04', timeSlot: 'MORNING',
  shoreTime: '10:00', participantCount: 1, status: 'CONFIRMED', ...extra,
});

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  tenantId = (await prisma.tenant.create({ data: { name: `Shore ${run}`, slug: `shore-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Shore ${run}` })));
  const u = await prisma.user.create({
    data: { email: `shore-admin-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId, role: 'ADMIN' } } },
  });
  admin = await jwt.signAsync({ sub: u.id, email: u.email, role: 'ADMIN', tenantId });
  boatId = (await ok('POST', '/boats', { name: 'Shore test boat', capacity: 12, registrationNumber: `S-${run}` })).id;
  reefSiteId = (await ok('POST', '/dive-sites', site(`Reef ${run}`, false))).id;
  customerId = (await ok('POST', '/customers', { email: `shore-c-${run}@example.test`, firstName: 'Sol', lastName: 'Shore', country: 'ES' })).id;
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

describe('shore bookings', () => {
  it('need a shore site, a valid start time, and either a boat or a shore time', async () => {
    expect((await call('POST', '/bookings', shoreBooking())).data.message).toMatch(/no shore dive site/);
    shoreSiteId = (await ok('POST', '/dive-sites', site(`Harbour ${run}`, true))).id;
    expect((await call('POST', '/bookings', shoreBooking({ shoreTime: '10:20' }))).data.message).toMatch(/starts at 09:30, 10:00, 10:15, 10:30/);
    expect((await call('POST', '/bookings', shoreBooking({ shoreTime: '15:00' }))).status).toBe(400); // an afternoon time
    expect((await call('POST', '/bookings', shoreBooking({ boatId }))).data.message).toMatch(/not both/);
    expect((await call('POST', '/bookings', shoreBooking({ shoreTime: undefined }))).status).toBe(400);
    expect((await call('POST', '/bookings', shoreBooking({ siteId: reefSiteId }))).data.message).toMatch(/not a shore dive site/);
  });

  it('go on the shore session for their site, date and time, made when needed', async () => {
    const a = await ok('POST', '/bookings', shoreBooking());
    expect(a).toMatchObject({ boatId: null, shoreTime: '10:00', siteId: shoreSiteId, trip: { isShore: true, startTime: '10:00' } });
    const b = await ok('POST', '/bookings', shoreBooking({ participantCount: 2 }));
    expect(b.trip.id).toBe(a.trip.id);
    const c = await ok('POST', '/bookings', shoreBooking({ shoreTime: '10:30' }));
    expect(c.trip.id).not.toBe(a.trip.id);
    const trip = await ok('GET', `/trips/${a.trip.id}`);
    expect(trip).toMatchObject({ isShore: true, boatId: null, startTime: '10:00', plannedSiteId: shoreSiteId, capacity: { divers: 3 } });
    // The schedule lists boat trips first, then shore sessions by time.
    await ok('POST', '/trips', { date: '2030-04-04', timeSlot: 'MORNING', boatId });
    const day = await ok('GET', '/trips?from=2030-04-04&to=2030-04-04');
    expect(day.map((t: { isShore: boolean; startTime: string | null }) => (t.isShore ? t.startTime : 'boat'))).toEqual(['boat', '10:00', '10:30']);
  });

  it('respect the session\'s places', async () => {
    const trip = await ok('POST', '/trips', { date: '2030-04-04', timeSlot: 'MORNING', startTime: '11:00', maxDivers: 2 });
    expect((await ok('POST', '/bookings', shoreBooking({ shoreTime: '11:00' }))).trip.id).toBe(trip.id);
    const full = await call('POST', '/bookings', shoreBooking({ shoreTime: '11:00', participantCount: 2 }));
    expect(full.status).toBe(409);
    expect(full.data.message).toMatch(/11:00 shore session is full/);
  });

  it('move between sessions, and between shore and boat', async () => {
    const b = await ok('POST', '/bookings', shoreBooking({ shoreTime: '09:30' }));
    const moved = await ok('PATCH', `/bookings/${b.id}`, { shoreTime: '12:00' });
    expect(moved.trip.startTime).toBe('12:00');
    const onBoat = await ok('PATCH', `/bookings/${b.id}`, { boatId, siteId: reefSiteId });
    expect(onBoat).toMatchObject({ boatId, shoreTime: null, trip: null });
    const back = await ok('PATCH', `/bookings/${b.id}`, { shoreTime: '09:30', siteId: shoreSiteId });
    expect(back).toMatchObject({ boatId: null, shoreTime: '09:30', trip: { isShore: true, startTime: '09:30' } });
  });

  it('keep boat and shore apart', async () => {
    const shore = await ok('POST', '/bookings', shoreBooking({ shoreTime: '11:30' }));
    const boatTrip = (await ok('GET', '/trips?from=2030-04-04&to=2030-04-04')).find((t: { isShore: boolean }) => !t.isShore);
    expect((await call('POST', `/trips/${boatTrip.id}/bookings/${shore.id}`)).data.message).toMatch(/shore booking cannot join a boat trip/);
    const boatBooking = await ok('POST', '/bookings', { ...shoreBooking({ shoreTime: undefined, boatId, siteId: reefSiteId }), activityType: 'FUN_DIVE' });
    expect((await call('POST', `/trips/${shore.trip.id}/bookings/${boatBooking.id}`)).data.message).toMatch(/boat booking cannot join a shore trip/);
    expect((await call('POST', '/trips', { date: '2030-04-05', timeSlot: 'AFTERNOON', boatId, startTime: '14:30' })).data.message).toMatch(/Only shore trips/);
  });

  it('move with their session when its start time changes', async () => {
    const session = await ok('POST', '/trips', { date: '2030-04-05', timeSlot: 'AFTERNOON', startTime: '14:30' });
    expect(session).toMatchObject({ isShore: true, startTime: '14:30', plannedSiteId: shoreSiteId });
    const kept = await ok('POST', '/bookings', shoreBooking({ date: '2030-04-05', timeSlot: 'AFTERNOON', shoreTime: '14:30' }));
    expect(kept.trip.id).toBe(session.id);
    await ok('POST', '/trips', { date: '2030-04-05', timeSlot: 'AFTERNOON', startTime: '15:00' });
    expect((await call('PATCH', `/trips/${session.id}`, { startTime: '15:00' })).data.message).toMatch(/already a 15:00 shore session/);
    expect((await call('PATCH', `/trips/${session.id}`, { startTime: '09:30' })).data.message).toMatch(/starts at 14:00/);
    await ok('PATCH', `/trips/${session.id}`, { startTime: '16:00' });
    expect((await ok('GET', `/bookings/${kept.id}`)).shoreTime).toBe('16:00');
  });
});
