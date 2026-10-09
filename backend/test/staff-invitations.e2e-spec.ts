import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { seedTenantDefaults } from '../src/config/tenant-defaults.js';
import { MailerService } from '../src/mail/mailer.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runInTenant, runUnscoped } from '../src/tenant/tenant-context.js';

// Staff invitations from Settings → Users: a center admin invites by email;
// the person sets their own password (or, with a staff login elsewhere,
// confirms with it). The mailer is replaced by one that records messages, so
// the tests read the link from the email as the recipient would.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/staff-invitations.e2e-spec.ts

const run = randomUUID().slice(0, 8);
const mail = (who: string) => `inv-${who}-${run}@example.test`;

const outbox: { to: string; subject: string; text: string }[] = [];
const mailer = {
  configured: true,
  failing: false,
  async send(m: { to: string; subject: string; text: string }) {
    if (!this.configured || this.failing) return false;
    outbox.push(m);
    return true;
  },
};

let app: INestApplication;
let prisma: PrismaService;
let base: string;
const center: Record<'a' | 'b', { id: string; admin: string; instructor: string }> = {} as never;

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function ok(method: string, path: string, token?: string, body?: unknown) {
  const res = await call(method, path, token, body);
  if (res.status >= 300) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

// The token in the last email to this address.
function linkTo(email: string) {
  const m = [...outbox].reverse().find((x) => x.to === email);
  const token = m?.text.match(/\/invite\/([\w-]+)/)?.[1];
  if (!token) throw new Error(`No invitation email to ${email}`);
  return token;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MailerService).useValue(mailer).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  for (const key of ['a', 'b'] as const) {
    const t = await prisma.tenant.create({ data: { name: `Invite ${key} ${run}`, slug: `inv-${key}-${run}` } });
    await runInTenant(t.id, () => prisma.$transaction((tx) => seedTenantDefaults(tx, { name: `Invite ${key}` })));
    const token = async (who: string, role: 'ADMIN' | 'INSTRUCTOR') => {
      const u = await prisma.user.create({
        data: {
          email: mail(`${who}-${key}`),
          passwordHash: await bcrypt.hash('Known-pass-1', 4),
          role,
          memberships: { create: { tenantId: t.id, role } },
        },
      });
      return jwt.signAsync({ sub: u.id, email: u.email, role, tenantId: t.id });
    };
    center[key] = { id: t.id, admin: await token('admin', 'ADMIN'), instructor: await token('instructor', 'INSTRUCTOR') };
  }
}, 60_000);

beforeEach(() => {
  mailer.configured = true;
  mailer.failing = false;
});

afterAll(async () => {
  await runUnscoped(async () => {
    if (prisma) {
      const ids = Object.values(center).map((c) => c.id);
      await prisma.invitation.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.membership.deleteMany({ where: { tenantId: { in: ids } } });
      for (const table of ['CenterSettings', 'ActivityPrice', 'EquipmentPrice', 'FunDiveTier', 'AddOnPrice', 'DivePack', 'InsurancePrice']) {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "tenantId" = ANY($1::text[])`, ids);
      }
      await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
      await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
    }
  });
  await app?.close();
});

describe('staff invitations', () => {
  it('are for admins only', async () => {
    expect((await call('GET', '/users/invitations', center.a.instructor)).status).toBe(403);
    expect((await call('POST', '/users/invite', center.a.instructor, { email: mail('x'), role: 'INSTRUCTOR' })).status).toBe(403);
  });

  it('without email set up: inviting is refused, and adding staff with a password is the fallback', async () => {
    mailer.configured = false;
    const res = await call('POST', '/users/invite', center.a.admin, { email: mail('nomail'), role: 'INSTRUCTOR' });
    expect(res.status).toBe(503);
    expect(res.data.message).toMatch(/SMTP_URL/);
    expect((await ok('GET', '/users/invitations', center.a.admin)).emailConfigured).toBe(false);
    await ok('POST', '/users', center.a.admin, { email: mail('fallback'), password: 'Fallback-1', role: 'INSTRUCTOR' });
  });

  it('with email set up: staff cannot be created with a password; customer logins still can, for this center', async () => {
    const staff = await call('POST', '/users', center.a.admin, { email: mail('typed'), password: 'Typed-pass-1', role: 'INSTRUCTOR' });
    expect(staff.status).toBe(409);
    expect(staff.data.message).toMatch(/Invite staff instead/);
    const customer = await ok('POST', '/users', center.a.admin, { email: mail('cust'), password: 'Cust-pass-1', role: 'CUSTOMER' });
    expect(customer.role).toBe('CUSTOMER');
    const row = await prisma.user.findFirst({ where: { email: mail('cust') }, select: { tenantId: true } });
    expect(row?.tenantId).toBe(center.a.id);
  });

  it('a new person: the email carries a one-time link; they set their own name and password', async () => {
    const email = mail('new');
    const sent = await ok('POST', '/users/invite', center.a.admin, { email: email.toUpperCase(), role: 'INSTRUCTOR' });
    expect(sent).toMatchObject({ email, role: 'INSTRUCTOR', emailed: true });
    expect(sent).not.toHaveProperty('link'); // the admin never sees it
    const days = (Date.parse(sent.expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);

    const list = await ok('GET', '/users/invitations', center.a.admin);
    expect(list.emailConfigured).toBe(true);
    expect(list.invitations.find((i: { email: string }) => i.email === email)).toMatchObject({ role: 'INSTRUCTOR', status: 'PENDING' });

    const token = linkTo(email);
    expect(await ok('GET', `/invitations/${token}`)).toMatchObject({ email, existingAccount: false, role: 'INSTRUCTOR' });
    await ok('POST', `/invitations/${token}/accept`, undefined, { name: 'Nina New', password: 'Her-own-pass-1' });
    // Signed in with the password they chose, as staff of this center.
    const login = await ok('POST', '/auth/login', undefined, { email, password: 'Her-own-pass-1' });
    expect(login.tenant.id).toBe(center.a.id);
    expect(login.user.role).toBe('INSTRUCTOR');
    // Used once, and no longer listed.
    expect((await call('POST', `/invitations/${token}/accept`, undefined, { name: 'X', password: 'Another-pass-1' })).status).toBe(409);
    expect((await ok('GET', '/users/invitations', center.a.admin)).invitations.some((i: { email: string }) => i.email === email)).toBe(false);
    // Inviting them again: they already have access.
    expect((await call('POST', '/users/invite', center.a.admin, { email, role: 'ADMIN' })).status).toBe(409);
  });

  it('staff of another center confirm with their current password and get access here', async () => {
    const email = mail('admin-b'); // an admin of center B
    await ok('POST', '/users/invite', center.a.admin, { email, role: 'INSTRUCTOR' });
    const token = linkTo(email);
    expect(await ok('GET', `/invitations/${token}`)).toMatchObject({ existingAccount: true });
    expect((await call('POST', `/invitations/${token}/accept`, undefined, { currentPassword: 'wrong-pass' })).status).toBe(400);
    await ok('POST', `/invitations/${token}/accept`, undefined, { currentPassword: 'Known-pass-1' });
    const login = await ok('POST', '/auth/login', undefined, { email, password: 'Known-pass-1' });
    expect(login.requiresTenantSelection).toBe(true);
    expect(login.tenants.map((t: { id: string }) => t.id).sort()).toEqual([center.a.id, center.b.id].sort());
  });

  it('resend issues a fresh link (the old one stops working); cancel withdraws it', async () => {
    const email = mail('resend');
    const first = await ok('POST', '/users/invite', center.a.admin, { email, role: 'ADMIN' });
    const oldToken = linkTo(email);
    const again = await ok('POST', `/users/invitations/${first.id}/resend`, center.a.admin);
    const newToken = linkTo(email);
    expect(newToken).not.toBe(oldToken);
    // The old link shows as withdrawn and cannot be accepted.
    expect((await ok('GET', `/invitations/${oldToken}`)).status).toBe('REVOKED');
    expect((await call('POST', `/invitations/${oldToken}/accept`, undefined, { name: 'X', password: 'Some-pass-12' })).status).toBe(410);
    expect(await ok('GET', `/invitations/${newToken}`)).toMatchObject({ email, role: 'ADMIN' });
    // One open invitation per email.
    const open = (await ok('GET', '/users/invitations', center.a.admin)).invitations.filter((i: { email: string }) => i.email === email);
    expect(open.map((i: { id: string }) => i.id)).toEqual([again.id]);

    // Another center cannot touch it.
    expect((await call('POST', `/users/invitations/${again.id}/resend`, center.b.admin)).status).toBe(404);
    expect((await call('DELETE', `/users/invitations/${again.id}`, center.b.admin)).status).toBe(404);

    await ok('DELETE', `/users/invitations/${again.id}`, center.a.admin);
    expect((await ok('GET', `/invitations/${newToken}`)).status).toBe('REVOKED');
    expect((await call('POST', `/invitations/${newToken}/accept`, undefined, { name: 'X', password: 'Some-pass-12' })).status).toBe(410);
    expect((await ok('GET', '/users/invitations', center.a.admin)).invitations.some((i: { email: string }) => i.email === email)).toBe(false);
    expect((await call('POST', `/users/invitations/${again.id}/resend`, center.a.admin)).status).toBe(404);
  });

  it('an invitation the mail server refused stays listed, to resend', async () => {
    mailer.failing = true;
    const email = mail('bounce');
    const sent = await ok('POST', '/users/invite', center.a.admin, { email, role: 'INSTRUCTOR' });
    expect(sent.emailed).toBe(false);
    expect((await ok('GET', '/users/invitations', center.a.admin)).invitations.some((i: { email: string }) => i.email === email)).toBe(true);
    mailer.failing = false;
    expect((await ok('POST', `/users/invitations/${sent.id}/resend`, center.a.admin)).emailed).toBe(true);
  });
});
