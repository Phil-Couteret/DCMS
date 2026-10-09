import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedTenantDefaults } from '../src/config/tenant-defaults.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runInTenant, runUnscoped } from '../src/tenant/tenant-context.js';

// Staff profiles and qualifications, equipment, number of dives per booking,
// the dashboard figures and emailing invoices. Creates a tenant (with its
// settings and prices) and removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/backoffice-features.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tenantId = '';
let admin = '';
let instructor = '';
let instructorUserId = '';
let outsiderUserId = '';

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

beforeAll(async () => {
  delete process.env.SMTP_URL;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  tenantId = (await prisma.tenant.create({ data: { name: `Feat ${run}`, slug: `feat-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Feat ${run}` })));
  const make = async (who: string, role: 'ADMIN' | 'INSTRUCTOR' | null) =>
    prisma.user.create({
      data: {
        email: `feat-${who}-${run}@example.test`,
        passwordHash: 'x',
        role: role ?? 'INSTRUCTOR',
        ...(role && { memberships: { create: { tenantId, role } } }),
      },
    });
  const a = await make('admin', 'ADMIN');
  const i = await make('instructor', 'INSTRUCTOR');
  instructorUserId = i.id;
  outsiderUserId = (await make('outsider', null)).id;
  admin = await jwt.signAsync({ sub: a.id, email: a.email, role: 'ADMIN', tenantId });
  instructor = await jwt.signAsync({ sub: i.id, email: i.email, role: 'INSTRUCTOR', tenantId });
}, 60_000);

afterAll(() =>
  runUnscoped(async () => {
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
    await app?.close();
  }),
);

describe('staff profiles', () => {
  let staffId = '';
  const profile = { firstName: 'Ina', lastName: 'Guide', phone: '+34 600 000 000', type: 'GUIDE', hireDate: '2026-01-15' };

  it('are created by admins, for an account of the center only', async () => {
    expect((await call('POST', '/staff', instructor, { ...profile, userId: instructorUserId })).status).toBe(403);
    const outsider = await call('POST', '/staff', admin, { ...profile, userId: outsiderUserId });
    expect(outsider.status).toBe(400);
    const made = await ok('POST', '/staff', admin, { ...profile, userId: instructorUserId });
    staffId = made.id;
    // The outsider was not given access to the center.
    const m = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: outsiderUserId, tenantId } } });
    expect(m).toBeNull();
  });

  it('are edited by admins; the account cannot change; any staff member sets the status', async () => {
    const edited = await ok('PATCH', `/staff/${staffId}`, admin, { lastName: 'Captain', type: 'CAPTAIN' });
    expect(edited).toMatchObject({ lastName: 'Captain', type: 'CAPTAIN' });
    expect((await call('PATCH', `/staff/${staffId}`, admin, { userId: outsiderUserId })).status).toBe(400);
    expect((await call('PATCH', `/staff/${staffId}`, instructor, { lastName: 'X' })).status).toBe(403);
    expect((await ok('PATCH', `/staff/${staffId}/status`, instructor, { status: 'INACTIVE' })).status).toBe('INACTIVE');
  });

  it('qualifications are added, edited and deleted by admins', async () => {
    const q = await ok('POST', `/staff/${staffId}/qualifications`, admin, {
      type: 'Open Water Instructor',
      agency: 'PADI',
      number: 'OWSI-1',
      issueDate: '2025-03-01',
      expiryDate: '2027-03-01',
    });
    const edited = await ok('PATCH', `/staff/${staffId}/qualifications/${q.id}`, admin, { number: 'OWSI-2', expiryDate: null });
    expect(edited).toMatchObject({ number: 'OWSI-2', expiryDate: null });
    expect((await call('PATCH', `/staff/${staffId}/qualifications/${q.id}`, admin, { issueDate: '2028-01-01', expiryDate: '2027-01-01' })).status).toBe(400);
    expect((await call('DELETE', `/staff/${staffId}/qualifications/${q.id}`, instructor)).status).toBe(403);
    await ok('DELETE', `/staff/${staffId}/qualifications/${q.id}`, admin);
    expect((await call('DELETE', `/staff/${staffId}/qualifications/${q.id}`, admin)).status).toBe(404);
  });
});

describe('equipment', () => {
  it('is added, edited (clearing optional fields) and deleted', async () => {
    const item = await ok('POST', '/equipment', instructor, {
      type: 'bcd',
      brand: 'Aqualung',
      model: 'Pro HD',
      size: 'M',
      serialNumber: `EQ-${run}`,
      condition: 'GOOD',
      purchaseDate: '2025-05-01',
      purchaseCost: 420.5,
      nextMaintenance: '2026-12-01',
    });
    const edited = await ok('PATCH', `/equipment/${item.id}`, instructor, { model: null, nextMaintenance: null, condition: 'FAIR' });
    expect(edited).toMatchObject({ model: null, nextMaintenance: null, condition: 'FAIR', brand: 'Aqualung' });
    await ok('DELETE', `/equipment/${item.id}`, instructor);
    expect((await call('GET', `/equipment/${item.id}`, instructor)).status).toBe(404);
  });
});

describe('number of dives per booking', () => {
  let customerId = '';
  let boatId = '';
  const booking = (extra: Record<string, unknown>) => ({
    customerId,
    boatId,
    activityType: 'FUN_DIVE',
    date: '2030-08-01',
    timeSlot: 'MORNING',
    participantCount: 1,
    status: 'CONFIRMED',
    ...extra,
  });

  beforeAll(async () => {
    boatId = (await ok('POST', '/boats', admin, { name: 'Dives', capacity: 12, registrationNumber: `D-${run}` })).id;
    customerId = (await ok('POST', '/customers', admin, { email: `feat-c-${run}@example.test`, firstName: 'D', lastName: 'C', country: 'ES' })).id;
  });

  it('defaults to 1, is validated, and is stored', async () => {
    expect((await ok('POST', '/bookings', admin, booking({}))).numberOfDives).toBe(1);
    expect((await call('POST', '/bookings', admin, booking({ numberOfDives: 0 }))).status).toBe(400);
    expect((await call('POST', '/bookings', admin, booking({ numberOfDives: 1.5 }))).status).toBe(400);
    const three = await ok('POST', '/bookings', admin, booking({ numberOfDives: 3, timeSlot: 'AFTERNOON' }));
    expect(three.numberOfDives).toBe(3);
    expect((await ok('PATCH', `/bookings/${three.id}`, admin, { numberOfDives: 2 })).numberOfDives).toBe(2);
  });

  it("is billed per dive for a fun dive invoiced on its own", async () => {
    const b = await ok('POST', '/bookings', admin, booking({ numberOfDives: 3, date: '2030-08-02' }));
    const invoice = await ok('POST', `/billing/from-booking/${b.id}`, admin);
    const line = invoice.items.find((i: { type: string }) => i.type === 'activity');
    expect(line).toMatchObject({ description: 'Fun Dive (3 dives)', quantity: 3 });
    expect(Number(line.total)).toBe(135); // 3 × 45
  });

  it("counts every dive toward the stay rate", async () => {
    const stays = await ok('GET', '/stays', admin);
    const stay = stays.find((s: { customer: { id: string } }) => s.customer.id === customerId);
    // The stay's open bookings: 1 + 2 dives (the 3-dive one was invoiced alone).
    expect(stay.totalDives).toBe(3);
  });
});

describe('dashboard overview', () => {
  it('gives admins revenue, everyone bookings by activity and the next 7 days', async () => {
    const forAdmin = await ok('GET', '/dashboard/overview', admin);
    expect(forAdmin.currency).toBe('EUR');
    expect(forAdmin.revenue.trend).toHaveLength(30);
    expect(forAdmin.revenue.trend.at(-1).date).toBe(forAdmin.today);
    expect(typeof forAdmin.revenue.month).toBe('string');
    expect(Array.isArray(forAdmin.bookingsByActivity)).toBe(true);
    expect(Array.isArray(forAdmin.upcoming)).toBe(true);
    const forInstructor = await ok('GET', '/dashboard/overview', instructor);
    expect(forInstructor.revenue).toBeNull();
  });

  it('counts a payment in today\'s revenue and this month', async () => {
    const before = await ok('GET', '/dashboard/overview', admin);
    const invoices = await ok('GET', '/billing', admin);
    await ok('POST', `/billing/${invoices[0].id}/payments`, admin, { amount: 10, method: 'CASH' });
    const after = await ok('GET', '/dashboard/overview', admin);
    expect(Number(after.revenue.month) - Number(before.revenue.month)).toBeCloseTo(10);
    expect(Number(after.revenue.trend.at(-1).amount) - Number(before.revenue.trend.at(-1).amount)).toBeCloseTo(10);
  });
});

describe('emailing an invoice', () => {
  it('is refused clearly when email is not set up, and checks its input', async () => {
    const invoices = await ok('GET', '/billing', admin);
    const pdf = Buffer.from('%PDF-1.4\n%test\n').toString('base64');
    const res = await call('POST', `/billing/${invoices[0].id}/email`, admin, { pdf, filename: 'INV.pdf' });
    expect(res.status).toBe(503);
    expect(res.data.message).toMatch(/SMTP_URL/);
    expect((await call('POST', `/billing/${invoices[0].id}/email`, admin, { pdf, filename: '../x.pdf' })).status).toBe(400);
  });
});
