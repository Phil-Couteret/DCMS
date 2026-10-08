import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runUnscoped } from '../src/tenant/tenant-context.js';

// Platform administration and onboarding (docs/MULTITENANT_PLAN.md, step 5):
// a center created in one go with its first location and an invitation for
// its first admin; usage against quotas; invitations accepted once.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/onboarding.e2e-spec.ts

const run = randomUUID().slice(0, 8);
const slug = `onb-${run}`;

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let superToken: string;
let staffToken: string;
let tenantId = '';

async function call(method: string, path: string, token?: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const tokenOf = (link: string) => link.split('/invite/')[1];

beforeAll(async () => {
  delete process.env.SMTP_URL;
  process.env.BACKOFFICE_URL = 'https://{slug}.admin.test';
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  const sup = await prisma.user.create({
    data: { email: `onb-super-${run}@example.test`, passwordHash: 'x', role: 'ADMIN', isSuperadmin: true },
  });
  superToken = await jwt.signAsync({ sub: sup.id, email: sup.email, role: 'SUPERADMIN', tenantId: null, isSuperadmin: true });
  const def = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'default' } });
  const member = await prisma.membership.findFirstOrThrow({ where: { tenantId: def.id, role: 'ADMIN', user: { isSuperadmin: false } }, include: { user: true } }).catch(() => null);
  staffToken = member
    ? await jwt.signAsync({ sub: member.userId, email: member.user.email, role: 'ADMIN', tenantId: def.id })
    : '';
}, 60_000);

// Cleanup crosses tenants: unscoped, which row-level security lets through.
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
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  }
  if (prisma) await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
  await app?.close();
  }),
);

describe('onboarding', () => {
  let link = '';

  it('creates the center, its settings, prices and first location, and invites its admin', async () => {
    const { status, data } = await call('POST', '/superadmin/tenants', superToken, {
      name: 'Onboard Divers',
      slug,
      timeZone: 'Europe/Madrid',
      firstLocation: { name: 'Harbour', type: 'DIVING' },
      firstAdmin: { email: `Onb-Admin-${run}@example.test`, name: 'Ona Admin' },
      quotas: { boats: 3 },
    });
    expect(status).toBe(201);
    tenantId = data.tenant.id;
    // No SMTP here: the link comes back to pass on.
    expect(data.invitation).toMatchObject({ email: `onb-admin-${run}@example.test`, emailed: false });
    expect(data.invitation.link).toMatch(new RegExp(`^https://${slug}\\.admin\\.test/invite/[A-Za-z0-9_-]{43}$`));
    link = data.invitation.link;

    const detail = await call('GET', `/superadmin/tenants/${tenantId}`, superToken);
    expect(detail.data.counts).toMatchObject({ locations: 1, boats: 0, staff: 0 });
    expect(detail.data.quotas).toMatchObject({ boats: 3, locations: 20, customers: 500 });
    expect(detail.data.usage.boats).toEqual({ used: 0, authorized: 3 });
    expect(detail.data.usage.storage.usedBytes).toBeGreaterThan(0); // settings, prices, location
    const invites = await call('GET', `/superadmin/tenants/${tenantId}/invitations`, superToken);
    expect(invites.data.map((i: { status: string }) => i.status)).toEqual(['PENDING']);
  });

  it('the invitation page shows who is invited to which center', async () => {
    const { status, data } = await call('GET', `/invitations/${tokenOf(link)}`);
    expect(status).toBe(200);
    expect(data).toMatchObject({
      email: `onb-admin-${run}@example.test`,
      name: 'Ona Admin',
      role: 'ADMIN',
      tenant: { name: 'Onboard Divers', slug },
      status: 'PENDING',
      existingAccount: false,
    });
    expect((await call('GET', '/invitations/not-a-token')).status).toBe(404);
  });

  it('accepting creates the account and its admin membership, once', async () => {
    const token = tokenOf(link);
    expect((await call('POST', `/invitations/${token}/accept`, undefined, { password: 'short' })).status).toBe(400);
    const ok = await call('POST', `/invitations/${token}/accept`, undefined, { name: 'Ona Admin', password: 'Onboard-pass-1' });
    expect(ok.status).toBe(200);
    expect(ok.data.signInUrl).toBe(`https://${slug}.admin.test/login`);
    expect((await call('POST', `/invitations/${token}/accept`, undefined, { name: 'X', password: 'Onboard-pass-1' })).status).toBe(409);

    const login = await call('POST', '/auth/login', undefined, { email: `onb-admin-${run}@example.test`, password: 'Onboard-pass-1' }, { 'X-Tenant-Slug': slug });
    expect(login.status).toBe(200);
    expect(login.data.user.role).toBe('ADMIN');
    expect(login.data.tenant.slug).toBe(slug);
  });

  it('a new invitation to the same email replaces the pending one', async () => {
    const first = await call('POST', `/superadmin/tenants/${tenantId}/invitations`, superToken, { email: `onb-inst-${run}@example.test`, role: 'INSTRUCTOR' });
    const second = await call('POST', `/superadmin/tenants/${tenantId}/invitations`, superToken, { email: `onb-inst-${run}@example.test`, role: 'INSTRUCTOR' });
    expect(first.status).toBe(201);
    expect((await call('GET', `/invitations/${tokenOf(first.data.link)}`)).data.status).toBe('REVOKED');
    expect((await call('POST', `/invitations/${tokenOf(first.data.link)}/accept`, undefined, { name: 'I', password: 'Onboard-pass-1' })).status).toBe(410);
    expect((await call('GET', `/invitations/${tokenOf(second.data.link)}`)).data.status).toBe('PENDING');
  });

  it('an existing staff account confirms with its password; a customer account is refused', async () => {
    const passwordHash = await bcrypt.hash('Existing-pass-1', 4);
    await prisma.user.create({ data: { email: `onb-staff-${run}@example.test`, passwordHash, role: 'INSTRUCTOR' } });
    await prisma.user.create({ data: { email: `onb-cust-${run}@example.test`, passwordHash, role: 'CUSTOMER' } });
    const staff = await call('POST', `/superadmin/tenants/${tenantId}/invitations`, superToken, { email: `onb-staff-${run}@example.test` });
    const token = tokenOf(staff.data.link);
    expect((await call('GET', `/invitations/${token}`)).data.existingAccount).toBe(true);
    expect((await call('POST', `/invitations/${token}/accept`, undefined, { currentPassword: 'wrong' })).status).toBe(400);
    expect((await call('POST', `/invitations/${token}/accept`, undefined, { currentPassword: 'Existing-pass-1' })).status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: `onb-staff-${run}@example.test` } });
    expect(await prisma.membership.findUnique({ where: { userId_tenantId: { userId: user.id, tenantId } } })).toMatchObject({ role: 'ADMIN', isActive: true });

    const cust = await call('POST', `/superadmin/tenants/${tenantId}/invitations`, superToken, { email: `onb-cust-${run}@example.test` });
    const refused = await call('POST', `/invitations/${tokenOf(cust.data.link)}/accept`, undefined, { currentPassword: 'Existing-pass-1' });
    expect(refused.status).toBe(400);
    expect(refused.data.message).toMatch(/customer account/);
  });

  it('an expired invitation cannot be used', async () => {
    const made = await call('POST', `/superadmin/tenants/${tenantId}/invitations`, superToken, { email: `onb-late-${run}@example.test` });
    await prisma.invitation.updateMany({ where: { email: `onb-late-${run}@example.test` }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await call('GET', `/invitations/${tokenOf(made.data.link)}`)).data.status).toBe('EXPIRED');
    expect((await call('POST', `/invitations/${tokenOf(made.data.link)}/accept`, undefined, { name: 'L', password: 'Onboard-pass-1' })).status).toBe(410);
  });

  it('only superadmins invite, see invitations and the overview', async () => {
    if (staffToken) {
      expect((await call('POST', `/superadmin/tenants/${tenantId}/invitations`, staffToken, { email: `x-${run}@example.test` })).status).toBe(403);
    }
    const overview = await call('GET', '/superadmin/overview', superToken);
    expect(overview.status).toBe(200);
    expect(overview.data.tenants).toBeGreaterThanOrEqual(2);
    expect(overview.data.storageBytes).toBeGreaterThan(0);
  });

  it('quotas are edited and the change is audited', async () => {
    const patched = await call('PATCH', `/superadmin/tenants/${tenantId}`, superToken, { quotas: { customers: 50, storagePricePerGbMonth: 0.25 } });
    expect(patched.status).toBe(200);
    expect(patched.data.quotas).toMatchObject({ customers: 50, boats: 3, storagePricePerGbMonth: 0.25 });
    expect((await call('PATCH', `/superadmin/tenants/${tenantId}`, superToken, { quotas: { boats: -1 } })).status).toBe(400);
    const log = await prisma.platformAuditLog.findFirst({ where: { tenantId, action: 'tenant.update' }, orderBy: { createdAt: 'desc' } });
    expect(log?.details).toMatchObject({ 'quotas.customers': { from: 500, to: 50 } });
  });
});
