import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Locations: their management, assigning boats and dive sites to them,
// bookings taking their boat's location, and the location filters of the
// schedule and dive prep. Creates two tenants and removes them again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/locations.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let admin: string;
let instructor: string;
let other: string;
const tenantIds: string[] = [];

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

const SITE = {
  nameEs: 'x',
  nameDe: 'x',
  nameFr: 'x',
  descriptionEs: 'x',
  descriptionEn: 'x',
  descriptionDe: 'x',
  descriptionFr: 'x',
  latitude: 28.1,
  longitude: -13.9,
  depthMin: 5,
  depthMax: 18,
  requiredCertLevel: 0,
  difficultyLevel: 1,
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

  const tokens: string[] = [];
  for (const tag of ['g', 'h']) {
    const tenant = await prisma.tenant.create({ data: { name: `Loc ${tag} ${run}`, slug: `loc-${tag}-${run}` } });
    tenantIds.push(tenant.id);
    const user = await prisma.user.create({
      data: {
        email: `loc-${tag}-${run}@example.test`,
        passwordHash: 'x',
        role: 'ADMIN',
        memberships: { create: { tenantId: tenant.id, role: 'ADMIN' } },
      },
    });
    tokens.push(await jwt.signAsync({ sub: user.id, email: user.email, role: 'ADMIN', tenantId: tenant.id }));
  }
  [admin, other] = tokens;
  const inst = await prisma.user.create({
    data: {
      email: `loc-inst-${run}@example.test`,
      passwordHash: 'x',
      role: 'INSTRUCTOR',
      memberships: { create: { tenantId: tenantIds[0], role: 'INSTRUCTOR' } },
    },
  });
  instructor = await jwt.signAsync({ sub: inst.id, email: inst.email, role: 'INSTRUCTOR', tenantId: tenantIds[0] });
}, 60_000);

afterAll(async () => {
  if (prisma) {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tenantId'`;
    for (let pass = 0; pass < 10; pass++) {
      let left = 0;
      for (const { table_name } of tables) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE "tenantId" = ANY($1::text[])`, tenantIds);
        } catch {
          left++;
        }
      }
      if (left === 0) break;
    }
    await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
  await app?.close();
});

describe('locations', () => {
  const ids: Record<string, string> = {};

  it('admins create and edit locations; empty address and contact fields are dropped', async () => {
    const north = await ok('POST', '/locations', admin, {
      name: ' North ',
      type: 'DIVING',
      address: { street: 'Calle 1', city: 'Caleta', postalCode: '', country: 'ES' },
      contactInfo: { phone: '+34 600', email: '' },
    });
    expect(north).toMatchObject({
      name: 'North',
      isActive: true,
      address: { street: 'Calle 1', city: 'Caleta', country: 'ES' },
      contactInfo: { phone: '+34 600' },
      boatCount: 0,
      diveSiteCount: 0,
    });
    ids.north = north.id;
    ids.south = (await ok('POST', '/locations', admin, { name: 'South', type: 'SURF' })).id;
    const edited = await ok('PATCH', `/locations/${ids.south}`, admin, { name: 'South', type: 'KITE', isActive: false });
    expect(edited).toMatchObject({ type: 'KITE', isActive: false, address: null });
    expect((await ok('GET', '/locations?active=true', admin)).map((l: { id: string }) => l.id)).toEqual([ids.north]);
  });

  it('instructors can read locations but not change them', async () => {
    expect((await call('GET', '/locations', instructor)).status).toBe(200);
    expect((await call('POST', '/locations', instructor, { name: 'X', type: 'DIVING' })).status).toBe(403);
  });

  it('refuses bad input and another tenant\'s location', async () => {
    expect((await call('POST', '/locations', admin, { name: 'X', type: 'BOAT' })).status).toBe(400);
    expect((await call('POST', '/locations', admin, { name: 'X', type: 'DIVING', contactInfo: { email: 'nope' } })).status).toBe(400);
    expect((await call('GET', `/locations/${ids.north}`, other)).status).toBe(404);
    const foreign = await call('POST', '/boats', other, { name: 'B', capacity: 4, registrationNumber: `L-${run}`, locationId: ids.north });
    expect(foreign.status).toBe(400);
  });

  it('assigns boats and dive sites, counts them, and filters by location', async () => {
    const boat = await ok('POST', '/boats', admin, { name: 'Nautilus', capacity: 8, registrationNumber: `N-${run}`, locationId: ids.north });
    expect(boat.location).toEqual({ id: ids.north, name: 'North' });
    ids.boat = boat.id;
    ids.loose = (await ok('POST', '/boats', admin, { name: 'Loose', capacity: 8, registrationNumber: `O-${run}` })).id;
    const site = await ok('POST', '/dive-sites', admin, { ...SITE, nameEn: 'Reef', locationId: ids.north });
    ids.site = site.id;
    ids.shoreSite = (await ok('POST', '/dive-sites', admin, { ...SITE, nameEn: 'Shore', locationId: ids.south })).id;

    expect(await ok('GET', `/locations/${ids.north}`, admin)).toMatchObject({ boatCount: 1, diveSiteCount: 1 });
    expect((await ok('GET', `/boats?locationId=${ids.north}`, admin)).map((b: { id: string }) => b.id)).toEqual([ids.boat]);
    expect((await ok('GET', '/boats?locationId=none', admin)).map((b: { id: string }) => b.id)).toEqual([ids.loose]);
    expect((await ok('GET', `/dive-sites?locationId=${ids.south}`, admin)).map((s: { id: string }) => s.id)).toEqual([ids.shoreSite]);

    // Moving the loose boat, then unassigning it again.
    expect((await ok('PATCH', `/boats/${ids.loose}`, admin, { locationId: ids.south })).location.name).toBe('South');
    expect((await ok('PATCH', `/boats/${ids.loose}`, admin, { locationId: null })).location).toBeNull();
  });

  it('a booking takes its boat\'s location, and the schedule and dive prep filter by it', async () => {
    const customer = await ok('POST', '/customers', admin, { email: `loc-c-${run}@example.test`, firstName: 'L', lastName: 'C', country: 'ES' });
    const booking = await ok('POST', '/bookings', admin, {
      customerId: customer.id,
      boatId: ids.boat,
      activityType: 'FUN_DIVE',
      date: '2030-07-01',
      timeSlot: 'MORNING',
      participantCount: 1,
    });
    expect(booking.locationId).toBe(ids.north);

    const boatTrip = await ok('POST', '/trips', admin, { date: '2030-07-01', timeSlot: 'MORNING', boatId: ids.boat });
    const shoreTrip = await ok('POST', '/trips', admin, { date: '2030-07-01', timeSlot: 'MORNING', plannedSiteId: ids.shoreSite });
    const list = async (q: string) =>
      (await ok('GET', `/trips?from=2030-07-01&to=2030-07-01${q}`, admin)).map((t: { id: string }) => t.id).sort();
    expect(await list('')).toEqual([boatTrip.id, shoreTrip.id].sort());
    expect(await list(`&locationId=${ids.north}`)).toEqual([boatTrip.id]);
    expect(await list(`&locationId=${ids.south}`)).toEqual([shoreTrip.id]);

    const prep = await ok('GET', `/dive-prep?date=2030-07-01&timeSlot=MORNING&locationId=${ids.south}`, admin);
    expect(prep.trips.map((t: { id: string }) => t.id)).toEqual([shoreTrip.id]);
    expect(prep.sites.map((s: { id: string }) => s.id)).toEqual([ids.shoreSite]);
    expect(prep.boatsWithoutTrip).toEqual([]);
  });

  it('deleting a location unassigns its boats, sites and bookings', async () => {
    await ok('DELETE', `/locations/${ids.north}`, admin);
    expect((await ok('GET', `/boats/${ids.boat}`, admin)).locationId).toBeNull();
    expect((await ok('GET', `/dive-sites/${ids.site}`, admin)).locationId).toBeNull();
    const bookings = await prisma.$queryRaw<{ locationId: string | null }[]>`
      SELECT "locationId" FROM "Booking" WHERE "tenantId" = ${tenantIds[0]}`;
    expect(bookings.length).toBe(1);
    expect(bookings[0].locationId).toBeNull();
  });
});
