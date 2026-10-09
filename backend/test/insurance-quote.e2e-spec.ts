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

// The booking form's live price (POST /stays/quote), the first-dive
// insurance check, dive insurance on the stay bill, and the location filters
// on bookings, dive logs and the compliance report. Creates a tenant and
// removes it again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/insurance-quote.e2e-spec.ts

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
  (await ok('POST', '/customers', { ...extra, email: `iq-${++seq}-${run}@example.test`, firstName: 'Ines', lastName: `Quote${seq}`, country: 'ES', customerType: 'TOURIST' })).id as string;

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
  tenantId = (await prisma.tenant.create({ data: { name: `Quote ${run}`, slug: `quote-${run}` } })).id;
  await runInTenant(tenantId, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Quote ${run}` })));
  const u = await prisma.user.create({
    data: { email: `iq-admin-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', memberships: { create: { tenantId, role: 'ADMIN' } } },
  });
  admin = await jwt.signAsync({ sub: u.id, email: u.email, role: 'ADMIN', tenantId });
  boatId = (await ok('POST', '/boats', { name: 'Quote', capacity: 30, registrationNumber: `Q-${run}` })).id;
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

const quote = (body: Record<string, unknown>) =>
  ok('POST', '/stays/quote', { activityType: 'FUN_DIVE', date: isoDay(3), timeSlot: 'MORNING', participantCount: 1, ...body });

describe('insurance prices', () => {
  const periods = (list: { name: string; days: number; price: number }[]) => list.map(({ name, days, price }) => ({ name, days, price }));

  it('a new center has the default periods; staff add, change and remove them', async () => {
    const p = await priceList();
    expect(periods(p.insurance)).toEqual([
      { name: '1 day', days: 1, price: 7 },
      { name: '1 week', days: 7, price: 18 },
      { name: '1 month', days: 30, price: 25 },
      { name: '1 year', days: 365, price: 45 },
    ]);
    // Left out, they stay as they are.
    const { insurance: _kept, ...rest } = p;
    await ok('PUT', '/settings/pricing', rest);
    expect((await priceList()).insurance).toHaveLength(4);
    // Add "2 weeks", change "1 week", drop "1 year".
    const next = [
      { id: p.insurance[0].id, name: '1 day', days: 1, price: 7 },
      { id: p.insurance[1].id, name: '1 week', days: 7, price: 19.5 },
      { name: '  2   weeks ', days: 14, price: 30 },
      { name: '1 month', days: 30, price: 25 },
    ];
    await ok('PUT', '/settings/pricing', { ...p, insurance: next });
    const saved = await priceList();
    expect(periods(saved.insurance)).toEqual([
      { name: '1 day', days: 1, price: 7 },
      { name: '1 week', days: 7, price: 19.5 },
      { name: '2 weeks', days: 14, price: 30 },
      { name: '1 month', days: 30, price: 25 },
    ]);
    // Periods sent with their id keep it, even renamed.
    expect(saved.insurance[0].id).toBe(p.insurance[0].id);
    await ok('PUT', '/settings/pricing', { ...p, insurance: [{ id: p.insurance[0].id, name: 'One day', days: 1, price: 7 }] });
    expect((await priceList()).insurance).toEqual([{ id: p.insurance[0].id, name: 'One day', days: 1, price: 7 }]);
    const bad = async (insurance: unknown) => (await call('PUT', '/settings/pricing', { ...p, insurance })).status;
    expect(await bad([{ name: '1 day', days: 1, price: 7 }, { name: '1 DAY', days: 2, price: 8 }])).toBe(400);
    expect(await bad([{ name: '', days: 1, price: 7 }])).toBe(400);
    expect(await bad([{ name: 'x', days: 0, price: 7 }])).toBe(400);
    expect(await bad([{ name: 'x', days: 1, price: -1 }])).toBe(400);
    await ok('PUT', '/settings/pricing', p);
    expect(periods((await priceList()).insurance)).toEqual(periods(p.insurance));
  });
});

describe('live price (quote)', () => {
  it('prices a booking with no customer yet: activity, equipment, add-ons and tax', async () => {
    const q = await quote({ numberOfDives: 2, notes: hire, addOns: ['NIGHT_DIVE'] });
    // 2 fun dives at the 1-2 dive rate (46), regulator 10, night dive 20.
    expect(q.activity).toMatchObject({ unitPrice: '46.00', units: 2, total: '92.00' });
    expect(q.equipment.map((e: { total: string }) => e.total)).toEqual(['10.00']);
    expect(q.addOns.map((e: { total: string }) => e.total)).toEqual(['20.00']);
    expect(q.subtotal).toBe('122.00');
    expect(Number(q.total)).toBeCloseTo(Number(q.subtotal) + Number(q.tax), 2);
    expect(q.stayDives).toBe(2);
    expect(q.insurance.check).toBe(true); // a new customer's first dive
  });

  it("counts the customer's stay toward the fun dive tier, and says what the stay's total changes by", async () => {
    const c = await customer();
    await booking(c, { date: isoDay(1), numberOfDives: 2 });
    const q = await quote({ customerId: c, date: isoDay(2) });
    // 3 fun dives in the stay: the 3+ tier, 44.
    expect(q.stayDives).toBe(3);
    expect(q.activity.total).toBe('44.00');
    // The two booked dives drop from 46 to 44 too: 3 × 44 − 2 × 46.
    expect(q.stayChange).toBe('40.00');
    expect(q.insurance.check).toBe(false); // not the first diving booking
  });

  it('applies a bono, and reports a code that cannot be used', async () => {
    await ok('POST', '/bonos', { code: `IQ${run}`.toUpperCase(), type: 'PERCENTAGE', discountValue: 50, description: 'Half', validFrom: isoDay(-1) });
    const q = await quote({ activityType: 'SNORKELING', bonoCode: `iq${run}` });
    expect(q.bono).toEqual({ code: `IQ${run}`.toUpperCase(), discount: '12.50' });
    expect(q.discount).toBe('12.50');
    const bad = await quote({ activityType: 'SNORKELING', bonoCode: 'NOPE-1' });
    expect(bad.bono).toBeNull();
    expect(bad.bonoError).toMatch(/no bono/);
    expect(bad.discount).toBe('0.00');
  });

  it('a partner booking: the activity is the partner\'s to pay', async () => {
    const { partner } = await ok('POST', '/partners', { name: `P ${run}`, companyName: `P ${run} SL`, contactEmail: `iq-p-${run}@example.test`, commissionRate: 10 });
    const q = await quote({ partnerId: partner.id, notes: hire });
    expect(q.partnerPaid).toBe(true);
    expect(q.activity.total).toBe('0.00');
    expect(q.subtotal).toBe('10.00');
  });

  it('an edit keeps the prices locked on the booking, except what changes', async () => {
    const c = await customer();
    const b = await booking(c, { date: isoDay(20), activityType: 'SNORKELING', notes: hire });
    const p = await priceList();
    await ok('PUT', '/settings/pricing', { ...p, activities: { ...p.activities, snorkeling: 35 } });
    try {
      const same = await quote({ customerId: c, bookingId: b.id, activityType: 'SNORKELING', date: isoDay(20), notes: hire });
      expect(same.activity.total).toBe('25.00');
      expect(same.insurance.check).toBe(false); // edits are not checked
      const changed = await quote({ customerId: c, bookingId: b.id, activityType: 'DISCOVER_SCUBA', date: isoDay(20), notes: hire });
      expect(changed.activity.unitPrice).toBe(String(p.activities.discoverScuba.toFixed(2)));
    } finally {
      await ok('PUT', '/settings/pricing', p);
    }
  });
});

describe('first-dive insurance check', () => {
  it('only for diving, and not with insurance valid on the day or a signed waiver', async () => {
    const none = await customer();
    expect((await quote({ customerId: none })).insurance.check).toBe(true);
    expect((await quote({ customerId: none, activityType: 'SNORKELING' })).insurance.check).toBe(false);

    const insured = await customer({ insuranceProvider: 'DAN', insuranceExpiry: isoDay(30) });
    expect((await quote({ customerId: insured })).insurance).toMatchObject({ check: false, insuranceExpiry: isoDay(30) });
    // Expired by the booking's date.
    expect((await quote({ customerId: insured, date: isoDay(40) })).insurance.check).toBe(true);

    const waiver = await customer();
    await ok('PATCH', `/customers/${waiver}`, { waiverSignedAt: isoDay(0) });
    expect((await quote({ customerId: waiver })).insurance).toMatchObject({ check: false, waiverSignedAt: isoDay(0) });
  });
});

describe('dive insurance on the stay bill', () => {
  it('offers every period, suggesting the shortest that covers the diving days; staff may choose another', async () => {
    const c = await customer();
    await booking(c, { date: isoDay(1) });
    await booking(c, { date: isoDay(4), activityType: 'SNORKELING' });
    await booking(c, { date: isoDay(5) });
    const { insurance: options } = await priceList();
    const week = options.find((o: { name: string }) => o.name === '1 week');
    const month = options.find((o: { name: string }) => o.name === '1 month');
    const stay = await ok('GET', `/stays/customer/${c}`);
    // Diving on days 1 to 5: 5 days, so a week is suggested.
    expect(stay.insurance).toMatchObject({ cover: null, insuranceExpiry: null, waiverSignedAt: null });
    expect(stay.insurance.offer.days).toBe(5);
    expect(stay.insurance.offer.suggestedId).toBe(week.id);
    expect(stay.insurance.offer.options.map((o: { name: string; price: string }) => [o.name, o.price])).toEqual([
      ['1 day', '7.00'],
      ['1 week', '18.00'],
      ['1 month', '25.00'],
      ['1 year', '45.00'],
    ]);
    expect((await call('POST', `/stays/customer/${c}/insurance`, { periodId: randomUUID() })).status).toBe(400);
    // Staff choose a month instead.
    const cost = await ok('POST', `/stays/customer/${c}/insurance`, { periodId: month.id });
    expect(cost).toMatchObject({ category: 'INSURANCE', description: 'Dive insurance (1 month)', total: '25' });
    const after = await ok('GET', `/stays/customer/${c}`);
    expect(after.insurance).toMatchObject({ cover: 'added', offer: null });
    expect((await call('POST', `/stays/customer/${c}/insurance`, {})).status).toBe(409);
    const billed = await ok('POST', `/stays/customer/${c}/bill`, {});
    const invoice = await ok('GET', `/billing/${billed.invoiceId}`);
    expect(invoice.items.map((i: { description: string }) => i.description)).toContain('Insurance: Dive insurance (1 month)');
  });

  it('without a period chosen, adds the suggested one; longer stays get the longest period', async () => {
    const c = await customer();
    await booking(c, { date: isoDay(1) });
    expect(await ok('POST', `/stays/customer/${c}/insurance`, {})).toMatchObject({ description: 'Dive insurance (1 day)', total: '7' });

    // No period covers 400 days: the longest is suggested.
    const p = await priceList();
    await ok('PUT', '/settings/pricing', { ...p, insurance: [{ name: '3 days', days: 3, price: 12 }] });
    try {
      const long = await customer();
      await booking(long, { date: isoDay(1) });
      await booking(long, { date: isoDay(6) });
      const stay = await ok('GET', `/stays/customer/${long}`);
      expect(stay.insurance.offer.options.map((o: { name: string }) => o.name)).toEqual(['3 days']);
      expect(stay.insurance.offer.suggestedId).toBe(stay.insurance.offer.options[0].id);
      // With no period at all, nothing to add.
      await ok('PUT', '/settings/pricing', { ...p, insurance: [] });
      expect((await ok('GET', `/stays/customer/${long}`)).insurance.offer).toEqual({ days: 6, declaredDays: null, suggestedId: null, options: [] });
      expect((await call('POST', `/stays/customer/${long}/insurance`, {})).status).toBe(400);
    } finally {
      await ok('PUT', '/settings/pricing', p);
    }
  });

  it('nothing to offer when insured for the stay, with a waiver, or with no diving', async () => {
    const insured = await customer({ insuranceProvider: 'DAN', insuranceExpiry: isoDay(60) });
    await booking(insured, { date: isoDay(2) });
    expect((await ok('GET', `/stays/customer/${insured}`)).insurance).toMatchObject({ cover: 'insured', offer: null });
    expect((await call('POST', `/stays/customer/${insured}/insurance`, {})).status).toBe(409);

    const waiver = await customer({ waiverSignedAt: isoDay(0) });
    await booking(waiver, { date: isoDay(2) });
    expect((await ok('GET', `/stays/customer/${waiver}`)).insurance).toMatchObject({ cover: 'waiver', offer: null });

    const snorkel = await customer();
    await booking(snorkel, { date: isoDay(2), activityType: 'SNORKELING' });
    expect((await ok('GET', `/stays/customer/${snorkel}`)).insurance).toBeNull();
    expect((await call('POST', `/stays/customer/${snorkel}/insurance`, {})).status).toBe(400);
  });
});

describe('declared stay length', () => {
  const withTwoWeeks = async () => {
    const p = await priceList();
    const insurance = [
      ...p.insurance,
      { name: '2 weeks', days: 14, price: 30 },
    ];
    await ok('PUT', '/settings/pricing', { ...p, insurance });
    return p;
  };

  it('the insurance check suggests the period covering the declared stay', async () => {
    const p = await withTwoWeeks();
    try {
      const c = await customer();
      // 10 days: 2 weeks, the shortest period that covers them.
      const q = await quote({ customerId: c, plannedStayDays: 10 });
      expect(q.insurance).toMatchObject({ check: true, suggestion: { name: '2 weeks', days: 14, price: '30.00' } });
      // 20 days: no 2-week cover is enough, so the next period up.
      expect((await quote({ customerId: c, plannedStayDays: 20 })).insurance.suggestion).toMatchObject({ name: '1 month' });
      // Nothing declared yet: no suggestion.
      expect((await quote({ customerId: c })).insurance.suggestion).toBeNull();
      // No check (insured), no suggestion.
      const insured = await customer({ insuranceProvider: 'DAN', insuranceExpiry: isoDay(90) });
      expect((await quote({ customerId: insured, plannedStayDays: 10 })).insurance).toMatchObject({ check: false, suggestion: null });
      expect((await call('POST', '/stays/quote', { activityType: 'FUN_DIVE', date: isoDay(3), timeSlot: 'MORNING', participantCount: 1, plannedStayDays: 0 })).status).toBe(400);
    } finally {
      await ok('PUT', '/settings/pricing', p);
    }
  });

  it('the booking keeps it, and the Stays page pre-selects the period covering it (or the diving days if longer)', async () => {
    const p = await withTwoWeeks();
    try {
      const { insurance: options } = await priceList();
      const id = (name: string) => options.find((o: { name: string }) => o.name === name).id;
      const c = await customer();
      const b = await booking(c, { date: isoDay(1), plannedStayDays: 10 });
      expect(b.plannedStayDays).toBe(10);
      const stay = await ok('GET', `/stays/customer/${c}`);
      expect(stay.insurance.offer).toMatchObject({ days: 1, declaredDays: 10, suggestedId: id('2 weeks') });
      // Diving runs past the declared stay: the diving days decide.
      await booking(c, { date: isoDay(20) });
      expect((await ok('GET', `/stays/customer/${c}`)).insurance.offer).toMatchObject({ days: 20, declaredDays: 10, suggestedId: id('1 month') });
      // Staff can still choose another period.
      expect(await ok('POST', `/stays/customer/${c}/insurance`, { periodId: id('2 weeks') })).toMatchObject({ description: 'Dive insurance (2 weeks)' });
      // Corrected on the booking.
      expect((await ok('PATCH', `/bookings/${b.id}`, { plannedStayDays: 12 })).plannedStayDays).toBe(12);
    } finally {
      await ok('PUT', '/settings/pricing', p);
    }
  });
});

describe('first-dive insurance check, later bookings', () => {
  it('asks only on the first diving booking, not on the ones after it', async () => {
    const c = await customer();
    expect((await quote({ customerId: c })).insurance.check).toBe(true);
    await booking(c, { date: isoDay(1) });
    expect((await quote({ customerId: c, date: isoDay(2) })).insurance.check).toBe(false);
  });
});

describe('location filters', () => {
  it('bookings, the dashboard, dive logs and the compliance report filter by location', async () => {
    const north = await ok('POST', '/locations', { name: `North ${run}`, type: 'DIVING' });
    const south = await ok('POST', '/locations', { name: `South ${run}`, type: 'DIVING' });
    const northBoat = await ok('POST', '/boats', { name: 'Northern', capacity: 10, registrationNumber: `QN-${run}`, locationId: north.id });
    const c = await customer();
    const b = await ok('POST', '/bookings', {
      customerId: c, boatId: northBoat.id, activityType: 'FUN_DIVE', date: isoDay(2), timeSlot: 'MORNING', participantCount: 1, status: 'CONFIRMED',
    });
    const ids = async (locationId: string) =>
      ((await ok('GET', `/bookings?date=${isoDay(2)}&locationId=${locationId}`)) as { id: string }[]).map((x) => x.id);
    expect(await ids(north.id)).toEqual([b.id]);
    expect(await ids(south.id)).toEqual([]);
    expect((await call('GET', '/bookings?locationId=nope')).status).toBe(400);
    expect((await call('GET', `/dive-logs?locationId=${south.id}`)).status).toBe(200);
    const report = await ok('GET', `/dive-prep/compliance?date=${isoDay(2)}&locationId=${south.id}`);
    expect(report.trips).toEqual([]);
    expect((await call('GET', `/dive-prep/compliance?date=${isoDay(2)}&locationId=nope`)).status).toBe(400);
    const stay = await ok('GET', `/stays/customer/${c}`);
    expect(stay.bookings[0].locationId).toBe(north.id);
    const upcoming = async (locationId: string) =>
      ((await ok('GET', `/dashboard/overview?locationId=${locationId}`)).upcoming as { id: string }[]).map((x) => x.id);
    expect(await upcoming(north.id)).toContain(b.id);
    expect(await upcoming(south.id)).not.toContain(b.id);
  });
});
