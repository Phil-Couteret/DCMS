import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { seedTenantDefaults } from '../src/config/tenant-defaults.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runInTenant, runUnscoped } from '../src/tenant/tenant-context.js';

// Government bonos (and their discount on invoices), tanks and their CSV
// import, customer documents, and the customer CSV import. Creates two
// tenants and an upload folder, and removes them again.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/medium-features.e2e-spec.ts

const run = randomUUID().slice(0, 8);
const uploads = mkdtempSync(join(tmpdir(), 'dcms-uploads-'));

let app: INestApplication;
let prisma: PrismaService;
let base: string;
const tenantIds: string[] = [];
let admin = '';
let instructor = '';
let otherAdmin = '';
let boatId = '';
let locationId = '';

async function call(method: string, path: string, token?: string, body?: unknown) {
  const form = body instanceof FormData;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined && !form && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  const type = res.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

async function ok(method: string, path: string, token: string, body?: unknown) {
  const res = await call(method, path, token, body);
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

function upload(fields: Record<string, string>, file: { name: string; data: Buffer | string; type?: string }) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  form.set('file', new Blob([typeof file.data === 'string' ? file.data : new Uint8Array(file.data)], { type: file.type ?? 'application/octet-stream' }), file.name);
  return form;
}

const isoDay = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

beforeAll(async () => {
  process.env.UPLOAD_DIR = uploads;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  for (const key of ['a', 'b']) {
    const t = await prisma.tenant.create({ data: { name: `Mid ${key} ${run}`, slug: `mid-${key}-${run}` } });
    tenantIds.push(t.id);
    await runInTenant(t.id, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Mid ${key} ${run}` })));
  }
  const user = async (who: string, tenantId: string, role: 'ADMIN' | 'INSTRUCTOR') => {
    const u = await prisma.user.create({
      data: { email: `mid-${who}-${run}@example.test`, passwordHash: 'x', role, memberships: { create: { tenantId, role } } },
    });
    return jwt.signAsync({ sub: u.id, email: u.email, role, tenantId });
  };
  admin = await user('admin', tenantIds[0], 'ADMIN');
  instructor = await user('instructor', tenantIds[0], 'INSTRUCTOR');
  otherAdmin = await user('other', tenantIds[1], 'ADMIN');
  boatId = (await ok('POST', '/boats', admin, { name: 'Mid', capacity: 30, registrationNumber: `M-${run}` })).id;
  locationId = (await ok('POST', '/locations', admin, { name: `Harbour ${run}`, type: 'DIVING' })).id;
}, 60_000);

afterAll(async () => {
  await runUnscoped(async () => {
    if (prisma && tenantIds.length > 0) {
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
  });
  await app?.close();
  rmSync(uploads, { recursive: true, force: true });
});

let customerSeq = 0;
async function customer() {
  customerSeq++;
  return (await ok('POST', '/customers', admin, {
    email: `mid-c${customerSeq}-${run}@example.test`,
    firstName: 'Cora',
    lastName: `Diver${customerSeq}`,
    country: 'ES',
  })).id as string;
}

const bono = (extra: Record<string, unknown> = {}) => ({
  code: `gov-${randomUUID().slice(0, 6)}`,
  type: 'PERCENTAGE',
  discountValue: 20,
  description: 'Bono turístico Canarias',
  validFrom: '2026-01-01',
  validTo: '2031-12-31',
  ...extra,
});

describe('government bonos', () => {
  it('are managed by admins only, with checked terms', async () => {
    expect((await call('GET', '/bonos', instructor)).status).toBe(403);
    expect((await call('POST', '/bonos', instructor, bono())).status).toBe(403);
    const made = await ok('POST', '/bonos', admin, bono({ code: `dup-${run}` }));
    expect(made.code).toBe(`DUP-${run}`.toUpperCase());
    expect((await call('POST', '/bonos', admin, bono({ code: `DUP-${run}` }))).status).toBe(409);
    expect((await call('POST', '/bonos', admin, bono({ discountValue: 120 }))).status).toBe(400);
    expect((await call('POST', '/bonos', admin, bono({ validFrom: '2027-01-01', validTo: '2026-01-01' }))).status).toBe(400);
    expect((await call('POST', '/bonos', admin, bono({ code: 'bad code!' }))).status).toBe(400);
    const edited = await ok('PATCH', `/bonos/${made.id}`, admin, { type: 'FIXED', discountValue: 150, validTo: null });
    expect(edited).toMatchObject({ type: 'FIXED', discountValue: '150', validTo: null });
    expect((await call('PATCH', `/bonos/${made.id}`, admin, { type: 'PERCENTAGE' })).status).toBe(400); // 150%
    await ok('DELETE', `/bonos/${made.id}`, admin);
  });

  it('go on bookings by code, if active, valid on the date and not used up', async () => {
    const b = await ok('POST', '/bonos', admin, bono({ validFrom: '2030-01-01', validTo: '2030-12-31' }));
    const off = await ok('POST', '/bonos', admin, bono({ isActive: false }));
    const cust = await customer();
    const booking = (date: string, bonoCode: string) => ({
      customerId: cust, boatId, activityType: 'FUN_DIVE', date, timeSlot: 'MORNING', participantCount: 1, status: 'CONFIRMED', bonoCode,
    });
    const made = await ok('POST', '/bookings', instructor, booking('2030-05-01', b.code.toLowerCase()));
    expect(made.bono).toMatchObject({ code: b.code });
    expect((await call('POST', '/bookings', admin, booking('2030-05-01', 'NOPE-1'))).data.message).toMatch(/no bono/);
    expect((await call('POST', '/bookings', admin, booking('2031-05-01', b.code))).data.message).toMatch(/valid from 2030-01-01 to 2030-12-31/);
    expect((await call('POST', '/bookings', admin, booking('2030-05-01', off.code))).data.message).toMatch(/not active/);
    // Moving the booking out of the bono's dates is refused; removing it works.
    expect((await call('PATCH', `/bookings/${made.id}`, admin, { date: '2031-02-01' })).status).toBe(400);
    expect((await ok('PATCH', `/bookings/${made.id}`, admin, { bonoCode: '' })).bono).toBeNull();
    // A bono on bookings cannot be deleted.
    await ok('PATCH', `/bookings/${made.id}`, admin, { bonoCode: b.code });
    expect((await call('DELETE', `/bonos/${b.id}`, admin)).status).toBe(409);
  });

  it("discount a booking's activity on its invoice, count a use, and give it back when cancelled", async () => {
    const b = await ok('POST', '/bonos', admin, bono({ discountValue: 20 }));
    const cust = await customer();
    const booking = await ok('POST', '/bookings', admin, {
      customerId: cust, boatId, activityType: 'FUN_DIVE', date: '2030-06-01', timeSlot: 'AFTERNOON',
      participantCount: 1, numberOfDives: 2, status: 'CONFIRMED', bonoCode: b.code,
      notes: JSON.stringify({ selectedEquipment: ['regulator'] }),
    });
    const inv = await ok('POST', `/billing/from-booking/${booking.id}`, admin);
    const activity = Number(inv.items.find((i: { type: string }) => i.type === 'activity').total);
    expect(Number(inv.discount)).toBeCloseTo(activity * 0.2); // equipment is not discounted
    expect(Number(inv.subtotal)).toBeGreaterThan(activity);
    const taxable = Number(inv.subtotal) - Number(inv.discount);
    expect(Number(inv.total)).toBeCloseTo(taxable + Number(inv.tax));
    const settings = await ok('GET', '/settings', admin);
    expect(Number(inv.tax)).toBeCloseTo(Math.round(taxable * Number(settings.taxRate)) / 100);

    const used = (await ok('GET', '/bonos', admin)).find((x: { id: string }) => x.id === b.id);
    expect(used.usageCount).toBe(1);
    expect((await call('PATCH', `/bookings/${booking.id}`, admin, { bonoCode: '' })).status).toBe(409);
    await ok('DELETE', `/billing/${inv.id}`, admin);
    const back = (await ok('GET', '/bonos', admin)).find((x: { id: string }) => x.id === b.id);
    expect(back.usageCount).toBe(0);
  });

  it('cannot be used past its limit, even by two invoices', async () => {
    const b = await ok('POST', '/bonos', admin, bono({ type: 'FIXED', discountValue: 10, usageLimit: 1 }));
    const cust = await customer();
    const make = (slot: string) =>
      ok('POST', '/bookings', admin, {
        customerId: cust, boatId, activityType: 'FUN_DIVE', date: '2030-07-01', timeSlot: slot, participantCount: 1, status: 'CONFIRMED', bonoCode: b.code,
      });
    const [one, two] = [await make('MORNING'), await make('AFTERNOON')];
    const results = await Promise.all([one, two].map((x) => call('POST', `/billing/from-booking/${x.id}`, admin)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 201)!.data.discount).toBe('10');
    expect(results.find((r) => r.status === 409)!.data.message).toMatch(/usage limit/);
    expect((await call('PATCH', `/bonos/${b.id}`, admin, { usageLimit: 0 })).status).toBe(400);
    // A new booking cannot take it now.
    const third = await call('POST', '/bookings', admin, {
      customerId: cust, boatId, activityType: 'FUN_DIVE', date: '2030-07-02', timeSlot: 'MORNING', participantCount: 1, bonoCode: b.code,
    });
    expect(third.data.message).toMatch(/limit/);
  });

  it("discount a stay's invoice for each booking with a bono", async () => {
    const b = await ok('POST', '/bonos', admin, bono({ type: 'FIXED', discountValue: 15 }));
    const cust = await customer();
    for (const [day, code] of [[1, b.code], [2, null]] as const) {
      await ok('POST', '/bookings', admin, {
        customerId: cust, boatId, activityType: 'FUN_DIVE', date: isoDay(day), timeSlot: 'NIGHT', participantCount: 1, status: 'CONFIRMED',
        ...(code && { bonoCode: code }),
      });
    }
    const stay = await ok('GET', `/stays/customer/${cust}`, admin);
    expect(stay.totals.discount).toBe('15.00');
    expect(stay.bookings.map((x: { bono: unknown }) => x.bono)).toEqual([{ code: b.code, discount: '15.00' }, null]);
    const billed = await ok('POST', `/stays/customer/${cust}/bill`, admin);
    const inv = await ok('GET', `/billing/${billed.invoiceId}`, admin);
    expect(inv.discount).toBe('15');
    expect(inv.total).toBe(stay.totals.total);
    expect((await ok('GET', '/bonos', admin)).find((x: { id: string }) => x.id === b.id).usageCount).toBe(1);
    await ok('DELETE', `/billing/${inv.id}`, admin);
    expect((await ok('GET', '/bonos', admin)).find((x: { id: string }) => x.id === b.id).usageCount).toBe(0);
  });
});

describe('tanks', () => {
  it('are added, edited and deleted, with their tests due on schedule', async () => {
    const tank = await ok('POST', '/tanks', instructor, {
      serialNumber: `T-${run}`,
      size: '12L',
      locationId,
      visualInspectionDate: isoDay(-350), // due in 15 days
      hydrostaticTestDate: '2019-01-10', // overdue
    });
    expect(tank).toMatchObject({ status: 'ACTIVE', visualState: 'DUE_SOON', hydrostaticState: 'OVERDUE', nextHydrostaticTest: '2024-01-10' });
    expect(tank.location.name).toBe(`Harbour ${run}`);
    expect((await call('POST', '/tanks', admin, { serialNumber: `T-${run}`, size: '12L' })).status).toBe(409);
    expect((await call('POST', '/tanks', admin, { serialNumber: 'X', size: '7L' })).status).toBe(400);
    const edited = await ok('PATCH', `/tanks/${tank.id}`, instructor, { hydrostaticTestDate: isoDay(-10), visualInspectionDate: null, status: 'RETIRED' });
    expect(edited).toMatchObject({ hydrostaticState: 'OK', visualState: 'NO_RECORD', status: 'RETIRED' });
    expect((await ok('GET', '/tanks?status=RETIRED', admin)).map((t: { id: string }) => t.id)).toEqual([tank.id]);
    await ok('DELETE', `/tanks/${tank.id}`, admin);
    expect((await call('GET', `/tanks/${tank.id}`, admin)).status).toBe(404);
  });

  it('are imported from CSV: valid rows added, known serials skipped, problems reported', async () => {
    await ok('POST', '/tanks', admin, { serialNumber: `KNOWN-${run}`, size: '15L' });
    // The original system's headings, with ";" as Spanish spreadsheets save.
    const csv = [
      'SIZE;NUMBER;SERIAL NUMBER;NET COLOUR;LAST TEST (VISUAL);NEXT TEST (VISUAL);LAST TEST (HYDROSTATIC);NEXT TEST (HYDROSTATIC);REMARKS;LOCATION',
      `12;1;A-${run};Black;30/04/2026;;01/03/2023;;"basement; left";Harbour ${run}`,
      `Nitrox 15;2;B-${run};Blue;-;;2025-02-01;;;`,
      `15;3;KNOWN-${run};;;;;;;`,
      `7;4;C-${run};;;;;;;`,
      `12;5;D-${run};;31/02/2026;;;;;Nowhere`,
      `10;6;A-${run};;;;;;;`,
    ].join('\r\n');
    const res = await ok('POST', '/tanks/import', instructor, upload({}, { name: 'tanks.csv', data: csv, type: 'text/csv' }));
    expect(res.imported).toBe(2);
    expect(res.skipped).toEqual([
      { line: 4, reason: `tank KNOWN-${run} is already on record` },
      { line: 7, reason: `tank A-${run} is already on record` },
    ]);
    expect(res.errors.map((e: { line: number }) => e.line)).toEqual([5, 6]);
    expect(res.errors[1].message).toMatch(/not a date.*no location called "Nowhere"/);
    const tanks = await ok('GET', '/tanks', admin);
    const a = tanks.find((t: { serialNumber: string }) => t.serialNumber === `A-${run}`);
    expect(a).toMatchObject({ size: '12L', notes: 'basement; left', visualInspectionDate: '2026-04-30T00:00:00.000Z' });
    expect(a.location?.id).toBe(locationId);
    expect(tanks.find((t: { serialNumber: string }) => t.serialNumber === `B-${run}`)).toMatchObject({ size: 'Nitrox15L', visualInspectionDate: null });
    expect((await call('POST', '/tanks/import', admin, upload({}, { name: 'x.csv', data: 'foo,bar\n1,2' }))).status).toBe(400);
  });
});

describe('customer documents', () => {
  const pdf = Buffer.from('%PDF-1.4\n% a medical certificate\n%%EOF\n');

  it('are uploaded (PDFs and photos only), listed, downloaded and deleted', async () => {
    const cust = await customer();
    const doc = await ok('POST', `/customers/${cust}/documents`, instructor, upload({ type: 'MEDICAL_CERT' }, { name: '../../Médical cert.pdf', data: pdf, type: 'text/html' }));
    expect(doc).toMatchObject({ type: 'MEDICAL_CERT', filename: 'Médical cert.pdf', mimeType: 'application/pdf', size: pdf.length });
    expect(doc.storagePath).toBeUndefined();
    const onDisk = join(uploads, tenantIds[0], cust);
    expect(readdirSync(onDisk)).toEqual([`${doc.id}.pdf`]);

    const html = upload({ type: 'OTHER' }, { name: 'x.pdf', data: '<html><script>alert(1)</script></html>', type: 'application/pdf' });
    expect((await call('POST', `/customers/${cust}/documents`, admin, html)).status).toBe(400);
    expect((await call('POST', `/customers/${cust}/documents`, admin, upload({ type: 'PASSPORT' }, { name: 'a.pdf', data: pdf }))).status).toBe(400);
    const big = Buffer.concat([pdf, Buffer.alloc(10 * 1024 * 1024)]);
    expect((await call('POST', `/customers/${cust}/documents`, admin, upload({ type: 'OTHER' }, { name: 'big.pdf', data: big }))).status).toBe(413);

    expect((await ok('GET', `/customers/${cust}/documents`, admin)).map((d: { id: string }) => d.id)).toEqual([doc.id]);
    const file = await call('GET', `/customers/${cust}/documents/${doc.id}/file?download=1`, admin);
    expect(file.status).toBe(200);
    expect(Buffer.compare(file.data as Buffer, pdf)).toBe(0);
    expect(file.headers.get('content-type')).toBe('application/pdf');
    expect(file.headers.get('content-disposition')).toBe(`attachment; filename="M_dical cert.pdf"; filename*=UTF-8''M%C3%A9dical%20cert.pdf`);
    expect(file.headers.get('content-security-policy')).toBe('sandbox');

    // Another center sees nothing of it.
    expect((await call('GET', `/customers/${cust}/documents`, otherAdmin)).status).toBe(404);
    expect((await call('GET', `/customers/${cust}/documents/${doc.id}/file`, otherAdmin)).status).toBe(404);
    expect((await call('DELETE', `/customers/${cust}/documents/${doc.id}`, otherAdmin)).status).toBe(404);

    await ok('DELETE', `/customers/${cust}/documents/${doc.id}`, admin);
    expect(readdirSync(onDisk)).toEqual([]);
    expect((await call('GET', `/customers/${cust}/documents/${doc.id}/file`, admin)).status).toBe(404);
  });

  it("go with their customer's folder when the customer is deleted", async () => {
    const cust = await customer();
    await ok('POST', `/customers/${cust}/documents`, admin, upload({ type: 'INSURANCE' }, { name: 'ins.pdf', data: pdf }));
    const folder = join(uploads, tenantIds[0], cust);
    expect(existsSync(folder)).toBe(true);
    await ok('DELETE', `/customers/${cust}`, admin);
    expect(existsSync(folder)).toBe(false);
  });
});

describe('customer CSV import', () => {
  it('adds new customers with their certification, skips known emails, reports bad rows', async () => {
    const known = `mid-known-${run}@example.test`;
    await ok('POST', '/customers', admin, { email: known, firstName: 'Known', lastName: 'Diver', country: 'ES' });
    const csv = [
      'firstName,lastName,email,phone,dob,nationality,gender,customerType,centerSkillLevel,certificationLevel,certificationAgency',
      `Lena,Fischer,mid-i1-${run}@example.test,+49 151 000,14/02/1990,DE,female,tourist,intermediate,Advanced Open Water,PADI`,
      `"O'Brien, Jr",Sean,MID-I2-${run}@EXAMPLE.TEST,,,ie,,LOCAL,,,`,
      `Known,Diver,${known},,,ES,,,,,`,
      `Bad,Row,not-an-email,,31/02/1990,,,,EXPERT,,PADI`,
      `Dup,InFile,mid-i1-${run}@example.test,,,DE,,,,,`,
      `Long,Country,mid-i3-${run}@example.test,,,Germany,,,,,`,
    ].join('\n');
    expect((await call('POST', '/customers/import', instructor, upload({}, { name: 'c.csv', data: csv }))).status).toBe(403);
    const res = await ok('POST', '/customers/import', admin, upload({}, { name: 'c.csv', data: csv, type: 'text/csv' }));
    expect(res.imported).toBe(2);
    expect(res.skipped.map((s: { line: number }) => s.line)).toEqual([4, 6]);
    expect(res.errors.map((e: { line: number }) => e.line)).toEqual([5, 7]);
    expect(res.errors[1].message).toMatch(/"Germany" is not a two-letter country code/);
    for (const problem of [/email "not-an-email"/, /dob "31\/02\/1990"/, /nationality is missing/, /certificationLevel and certificationAgency/]) {
      expect(res.errors[0].message).toMatch(problem);
    }

    const all = await ok('GET', '/customers', admin);
    const lena = all.find((c: { email: string }) => c.email === `mid-i1-${run}@example.test`);
    expect(lena).toMatchObject({ firstName: 'Lena', country: 'DE', customerType: 'TOURIST', centerSkillLevel: 'INTERMEDIATE', birthdate: '1990-02-14T00:00:00.000Z' });
    const certs = await ok('GET', `/customers/${lena.id}/certifications`, admin);
    expect(certs).toMatchObject([{ agency: 'PADI', level: 'Advanced Open Water' }]);
    const sean = all.find((c: { email: string }) => c.email === `mid-i2-${run}@example.test`);
    expect(sean).toMatchObject({ firstName: "O'Brien, Jr", customerType: 'LOCAL', country: 'IE' });

    expect((await call('POST', '/customers/import', admin, upload({}, { name: 'c.csv', data: 'firstName,email\nA,a@b.c' }))).data.message).toMatch(/lastName, nationality/);
    expect((await call('POST', '/customers/import', admin)).status).toBe(400);
  });
});
