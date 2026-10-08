import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runUnscoped } from '../src/tenant/tenant-context.js';
import { corsOptions, corsOriginAllowed, slugFromHost } from '../src/tenant/tenant-host.js';

// The tenant from the host (docs/MULTITENANT_PLAN.md, step 4): public routes
// act for the tenant a request names by X-Tenant-Slug, Origin or Host; a
// token's tenant wins over all of them; rate limits are per tenant.
//
//   npx vitest run --config ./vitest.config.e2e.ts test/tenant-host.e2e-spec.ts

const run = randomUUID().slice(0, 8);
const slug = { j: `host-j-${run}`, k: `host-k-${run}` };

let app: INestApplication;
let prisma: PrismaService;
let base: string;
const tenant: Record<'j' | 'k', string> = { j: '', k: '' };
let tokenJ: string;

// node:http rather than fetch, which does not let a request set its Host.
function call(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise<{ status: number; data: any }>((resolve, reject) => {
    const req = request(
      `${base}${path}`,
      { method, headers: { ...(payload && { 'Content-Type': 'application/json' }), ...headers } },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode ?? 0, data });
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

beforeAll(async () => {
  process.env.TENANT_DOMAINS = 'dcms.test, admin.test';
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors(corsOptions([]));
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  prisma = app.get(PrismaService);

  for (const key of ['j', 'k'] as const) {
    const t = await prisma.tenant.create({ data: { name: `Host ${key} ${run}`, slug: slug[key] } });
    tenant[key] = t.id;
    await runUnscoped(() => prisma.$executeRaw`INSERT INTO "CenterSettings" ("tenantId", "name", "updatedAt") VALUES (${t.id}, ${`Center ${key}`}, now())`);
  }
  const passwordHash = await bcrypt.hash('Host-pass-1', 4);
  const user = await prisma.user.create({
    data: { email: `host-j-${run}@example.test`, passwordHash, role: 'ADMIN', memberships: { create: { tenantId: tenant.j, role: 'ADMIN' } } },
  });
  // A customer account (no membership) for the customer sign-in.
  await prisma.user.create({ data: { email: `host-cust-${run}@example.test`, passwordHash, role: 'CUSTOMER' } });
  tokenJ = await app.get(JwtService).signAsync({ sub: user.id, email: user.email, role: 'ADMIN', tenantId: tenant.j });
}, 60_000);

// Cleanup crosses tenants: unscoped, which row-level security lets through.
afterAll(() =>
  runUnscoped(async () => {
  if (prisma) {
    const ids = Object.values(tenant).filter(Boolean);
    await prisma.$executeRaw`DELETE FROM "CenterSettings" WHERE "tenantId" = ANY(${ids}::text[])`;
    await prisma.user.deleteMany({ where: { email: { endsWith: `${run}@example.test` } } });
    await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
  }
  await app?.close();
  }),
);

describe('host parsing', () => {
  it('reads the slug one level below a tenant domain', () => {
    expect(slugFromHost('deepblue.dcms.test')).toBe('deepblue');
    expect(slugFromHost('DeepBlue.Admin.Test:3001')).toBe('deepblue');
    expect(slugFromHost('dcms.test')).toBeNull();
    expect(slugFromHost('a.b.dcms.test')).toBeNull();
    expect(slugFromHost('deepblue.dcms.test.evil.com')).toBeNull();
    expect(slugFromHost('10.10.10.1:3000')).toBeNull();
  });

  it('allows tenant subdomains over https as CORS origins, and the fixed ones', () => {
    expect(corsOriginAllowed('https://deepblue.dcms.test', [])).toBe(true);
    expect(corsOriginAllowed('http://deepblue.dcms.test', [])).toBe(false);
    expect(corsOriginAllowed('https://evil.com', [])).toBe(false);
    expect(corsOriginAllowed('http://localhost:3000', ['http://localhost:3000'])).toBe(true);
  });
});

describe('public routes', () => {
  it('act for the tenant named by X-Tenant-Slug, Origin or Host', async () => {
    const named: Record<string, string>[] = [
      { 'X-Tenant-Slug': slug.k },
      { Origin: `https://${slug.k}.dcms.test` },
      { Host: `${slug.k}.dcms.test` },
    ];
    for (const headers of named) {
      const { status, data } = await call('GET', '/center', headers);
      expect(status, JSON.stringify(headers)).toBe(200);
      expect(data.name).toBe('Center k');
    }
  });

  it('refuse an unknown or inactive tenant (404) and a request naming none (400)', async () => {
    expect((await call('GET', '/center', { 'X-Tenant-Slug': `nope-${run}` })).status).toBe(404);
    expect((await call('GET', '/center', { 'X-Tenant-Slug': 'Not A Slug' })).status).toBe(400);
    expect((await call('GET', '/center')).status).toBe(400);
    await prisma.tenant.update({ where: { id: tenant.k }, data: { isActive: false } });
    // Activation is cached for 30 seconds: a fresh slug lookup is needed.
    app.get((await import('../src/tenant/tenants.service.js')).TenantsService).forget();
    expect((await call('GET', '/center', { 'X-Tenant-Slug': slug.k })).status).toBe(404);
    await prisma.tenant.update({ where: { id: tenant.k }, data: { isActive: true } });
    app.get((await import('../src/tenant/tenants.service.js')).TenantsService).forget();
  });

  it('refuse a request naming two different tenants', async () => {
    const { status } = await call('GET', '/center', { 'X-Tenant-Slug': slug.j, Origin: `https://${slug.k}.dcms.test` });
    expect(status).toBe(400);
    expect((await call('GET', '/center', { 'X-Tenant-Slug': slug.j, Origin: `https://${slug.j}.dcms.test` })).status).toBe(200);
  });

  it('answer CORS for a tenant subdomain', async () => {
    const res = await fetch(`${base}/center`, { headers: { Origin: `https://${slug.j}.dcms.test` } });
    expect(res.headers.get('access-control-allow-origin')).toBe(`https://${slug.j}.dcms.test`);
  });
});

describe('sign-in', () => {
  it('a customer signs in to the tenant of the site, and needs one', async () => {
    const body = { email: `host-cust-${run}@example.test`, password: 'Host-pass-1' };
    expect((await call('POST', '/auth/login', {}, body)).status).toBe(401);
    const { status, data } = await call('POST', '/auth/login', { Host: `${slug.k}.dcms.test` }, body);
    expect(status).toBe(200);
    expect(data.tenant.id).toBe(tenant.k);
  });

  it('staff signing in on a center host enter that center, and only if they work there', async () => {
    const body = { email: `host-j-${run}@example.test`, password: 'Host-pass-1' };
    const j = await call('POST', '/auth/login', { 'X-Tenant-Slug': slug.j }, body);
    expect(j.status).toBe(200);
    expect(j.data.tenant.id).toBe(tenant.j);
    expect((await call('POST', '/auth/login', { 'X-Tenant-Slug': slug.k }, body)).status).toBe(403);
  });
});

describe('with a token', () => {
  it("the token's tenant wins: a host or slug naming another tenant is refused", async () => {
    const auth = { Authorization: `Bearer ${tokenJ}` };
    expect((await call('GET', '/boats', { ...auth, Host: `${slug.j}.admin.test` })).status).toBe(200);
    expect((await call('GET', '/boats', { ...auth, 'X-Tenant-Slug': slug.k })).status).toBe(403);
    expect((await call('GET', '/boats', { ...auth, Origin: `https://${slug.k}.dcms.test` })).status).toBe(403);
  });
});

describe('rate limits', () => {
  it('are counted per tenant and IP', async () => {
    // Guest bookings: 5 per hour. Invalid bodies count too (the guard runs first).
    for (let i = 0; i < 5; i++) {
      expect((await call('POST', '/bookings/guest', { 'X-Tenant-Slug': slug.j }, {})).status).toBe(400);
    }
    expect((await call('POST', '/bookings/guest', { 'X-Tenant-Slug': slug.j }, {})).status).toBe(429);
    expect((await call('POST', '/bookings/guest', { 'X-Tenant-Slug': slug.k }, {})).status).toBe(400);
  });
});
