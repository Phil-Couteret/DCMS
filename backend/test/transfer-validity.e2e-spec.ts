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

// The transfer add-on (price, pickup point, invoice and stay lines) and the
// issue date and validity of medical certificates and insurance. Creates a
// tenant and removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/transfer-validity.e2e-spec.ts

const run = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let tenantId = '';
let admin = '';
let boatId = '';

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
  (await ok('POST', '/customers', { ...extra, email: `tv-${++seq}-${run}@example.test`, firstName: 'Tom', lastName: `Transfer${seq}`, country: 'ES', customerType: 'TOURIST' })).id as string;

const booking = (customerId: string, extra: Record<string, unknown>) =>
  ok('POST', '/bookings', { customerId, boatId, activityType: 'FUN_DIVE', timeSlot: 'MORNING', participantCount: 1, status: 'CONFIRMED', ...extra });


beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  tenantId = (await prisma.tenant.create({ data: { name: `TransferV ${run}`, slug: `transfer-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `TransferV ${run}` })));
  const u = await prisma.user.create({
    data: { email: `tv-admin-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId, role: 'ADMIN' } } },
  });
  admin = await jwt.signAsync({ sub: u.id, email: u.email, role: 'ADMIN', tenantId });
  boatId = (await ok('POST', '/boats', { name: 'Shuttle', capacity: 12, registrationNumber: `TV-${run}` })).id;
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

// The price list as PUT takes it (GET adds the tax and currency).
const priceList = async () => {
  const { activities, equipment, funDiveTiers, addOns, divePacks, insurance } = await ok('GET', '/settings/pricing');
  return { activities, equipment, funDiveTiers, addOns, divePacks, insurance };
};

describe('transfer add-on', () => {
  it('has a configurable price; left out, it stays as it is', async () => {
    const p = await priceList();
    expect(p.addOns).toEqual({ nightDive: 20, personalInstructor: 100, transfer: 15 });
    await ok('PUT', '/settings/pricing', { ...p, addOns: { nightDive: 20, personalInstructor: 100 } });
    expect((await priceList()).addOns.transfer).toBe(15);
    await ok('PUT', '/settings/pricing', { ...p, addOns: { ...p.addOns, transfer: 18 } });
    expect((await priceList()).addOns.transfer).toBe(18);
    await ok('PUT', '/settings/pricing', p);
  });

  it('keeps the pickup point with the transfer, and bills it once per booking with it', async () => {
    const c = await customer();
    const b = await booking(c, { date: isoDay(2), participantCount: 2, addOns: ['TRANSFER'], transferPickup: '  Hotel Elba Castillo  ' });
    expect(b).toMatchObject({ addOns: ['TRANSFER'], transferPickup: 'Hotel Elba Castillo', addOnPrices: expect.objectContaining({ TRANSFER: 15 }) });
    // Without the transfer there is no pickup.
    const plain = await booking(c, { date: isoDay(3), activityType: 'SNORKELING', transferPickup: 'Somewhere' });
    expect(plain.transferPickup).toBeNull();
    expect((await call('POST', '/bookings', { customerId: c, boatId, activityType: 'FUN_DIVE', date: isoDay(4), timeSlot: 'MORNING', participantCount: 1, addOns: ['TRANSFER'], transferPickup: 'x'.repeat(201) })).status).toBe(400);

    const stay = await ok('GET', `/stays/customer/${c}`);
    const line = stay.bookings.find((x: { id: string }) => x.id === b.id);
    expect(line.addOns).toEqual([{ description: 'Transfer (pickup: Hotel Elba Castillo)', total: '15.00' }]);
    // 2 divers at the 1-dive stay rate (46), the transfer 15 once, the snorkeling 25.
    expect(stay.totals.bookings).toBe('132.00');
    const billed = await ok('POST', `/stays/customer/${c}/bill`, {});
    const invoice = await ok('GET', `/billing/${billed.invoiceId}`);
    expect(invoice.items.map((i: { description: string }) => i.description).some((d: string) => d.startsWith('Transfer (pickup: Hotel Elba Castillo)'))).toBe(true);
  });

  it('dropping the transfer clears the pickup; the live price shows it', async () => {
    const c = await customer();
    const b = await booking(c, { date: isoDay(20), activityType: 'SNORKELING', addOns: ['TRANSFER'], transferPickup: 'Port' });
    expect((await ok('PATCH', `/bookings/${b.id}`, { transferPickup: 'Harbour' })).transferPickup).toBe('Harbour');
    expect((await ok('PATCH', `/bookings/${b.id}`, { addOns: [] })).transferPickup).toBeNull();
    const q = await ok('POST', '/stays/quote', { activityType: 'SNORKELING', date: isoDay(21), timeSlot: 'MORNING', participantCount: 3, addOns: ['TRANSFER'], transferPickup: 'Port' });
    expect(q.addOns).toEqual([{ description: 'Transfer (pickup: Port)', total: '15.00' }]);
  });
});

describe('medical certificate and insurance validity', () => {
  it('issue date and days set the expiry, used by the checks; the expiry field otherwise', async () => {
    const issued = isoDay(-10);
    const c = await customer({ insuranceProvider: 'DAN', insuranceIssuedAt: issued, insuranceValidDays: 14, insuranceExpiry: isoDay(300), medicalCertIssuedAt: issued, medicalCertValidDays: 5 });
    const profile = await ok('GET', `/customers/${c}`);
    // Issued 10 days ago for 14 days: valid through 3 days from now.
    expect(profile.insuranceValidUntil.slice(0, 10)).toBe(isoDay(3));
    expect(profile.medicalCertValidUntil.slice(0, 10)).toBe(isoDay(-6));
    expect((await call('PATCH', `/customers/${c}`, { insuranceValidDays: 0 })).status).toBe(400);

    // The first-dive check: covered on day 3, not on day 4.
    const quote = (date: string) => ok('POST', '/stays/quote', { customerId: c, activityType: 'FUN_DIVE', date, timeSlot: 'MORNING', participantCount: 1 });
    expect((await quote(isoDay(3))).insurance).toMatchObject({ check: false, insuranceExpiry: isoDay(3) });
    expect((await quote(isoDay(4))).insurance.check).toBe(true);

    // Without the days, the expiry field counts again.
    await ok('PATCH', `/customers/${c}`, { insuranceValidDays: null });
    expect((await ok('GET', `/customers/${c}`)).insuranceValidUntil.slice(0, 10)).toBe(isoDay(300));
    // Changing the issue date clears the verification.
    await ok('PATCH', `/customers/${c}`, { insuranceVerifiedAt: new Date().toISOString() });
    expect((await ok('PATCH', `/customers/${c}`, { insuranceIssuedAt: isoDay(-1) })).insuranceVerifiedAt).toBeNull();
  });
});
