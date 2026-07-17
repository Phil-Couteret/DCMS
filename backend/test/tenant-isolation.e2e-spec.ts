import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';

/**
 * Phase 3 gate for Phase 4 (adding tenant_id everywhere): proves that with
 * the app running for real (real guards, real interceptor, real Prisma
 * queries), a tenant's own JWT cannot see or modify another tenant's data
 * through a normal, well-formed request - not just when a header disagrees
 * with the JWT (that's covered by tenant.interceptor.spec.ts), but the more
 * basic case of "does this service's query actually filter by tenant_id".
 *
 * REQUIRES A REAL, REACHABLE POSTGRES matching backend/.env's DATABASE_URL
 * (and a Prisma client generated against the current schema.prisma - run
 * `npm run prisma:generate` first if you haven't since pulling). This test
 * creates and deletes its own tenants/users/customers, namespaced by a
 * per-run timestamp, so it's safe to run against a shared dev database.
 *
 * Not run/verified as part of this change - the sandbox this was written
 * in has no reachable database and no way to fetch a matching Prisma
 * engine binary (see docs/roadmap.md Phase 3 status). Run it locally with:
 *   cd backend && npm run test:e2e -- tenant-isolation
 */
describe('Cross-tenant data isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  const runId = Date.now();
  let tenantA: { id: string };
  let tenantB: { id: string };
  let userA: { id: string; username: string };
  let userB: { id: string; username: string };
  let customerA: { id: string };
  let customerB: { id: string };
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // e2e tests bypass main.ts's bootstrap(), so replicate its global
    // ValidationPipe here to match production request handling.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    authService = moduleFixture.get(AuthService);

    // Seed two isolated tenants directly via Prisma (bypassing HTTP, since
    // this is test setup, not the thing under test), each with one admin
    // user and one customer.
    tenantA = await prisma.tenants.create({
      data: { slug: `e2e-tenant-a-${runId}`, name: 'E2E Tenant A', is_active: true },
    });
    tenantB = await prisma.tenants.create({
      data: { slug: `e2e-tenant-b-${runId}`, name: 'E2E Tenant B', is_active: true },
    });

    userA = await prisma.users.create({
      data: {
        username: `e2e-admin-a-${runId}`,
        name: 'E2E Admin A',
        password_hash: 'unused-jwt-is-signed-directly-in-this-test',
        role: 'admin',
        permissions: [],
        location_access: [],
        is_active: true,
        tenant_id: tenantA.id,
      },
    });
    userB = await prisma.users.create({
      data: {
        username: `e2e-admin-b-${runId}`,
        name: 'E2E Admin B',
        password_hash: 'unused-jwt-is-signed-directly-in-this-test',
        role: 'admin',
        permissions: [],
        location_access: [],
        is_active: true,
        tenant_id: tenantB.id,
      },
    });

    customerA = await prisma.customers.create({
      data: { first_name: 'Alice', last_name: 'TenantA', tenant_id: tenantA.id, is_active: true },
    });
    customerB = await prisma.customers.create({
      data: { first_name: 'Bob', last_name: 'TenantB', tenant_id: tenantB.id, is_active: true },
    });

    // Sign real tokens the same way AuthService.login() does, skipping the
    // bcrypt password check (irrelevant to what this suite verifies).
    tokenA = authService.signAdminToken({
      sub: userA.id,
      username: userA.username,
      tenantId: tenantA.id,
      role: 'admin',
      permissions: [],
    });
    tokenB = authService.signAdminToken({
      sub: userB.id,
      username: userB.username,
      tenantId: tenantB.id,
      role: 'admin',
      permissions: [],
    });
  });

  afterAll(async () => {
    // Clean up everything this run created, FK-safe order (children first).
    await prisma.customers.deleteMany({ where: { id: { in: [customerA?.id, customerB?.id].filter(Boolean) as string[] } } });
    await prisma.users.deleteMany({ where: { id: { in: [userA?.id, userB?.id].filter(Boolean) as string[] } } });
    await prisma.tenants.deleteMany({ where: { id: { in: [tenantA?.id, tenantB?.id].filter(Boolean) as string[] } } });
    await app.close();
  });

  it("does not include tenant B's customer when tenant A lists customers", async () => {
    const res = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(customerA.id);
    expect(ids).not.toContain(customerB.id);
  });

  it("returns 404 when tenant A fetches tenant B's customer by ID", async () => {
    await request(app.getHttpServer())
      .get(`/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it("returns 404 when tenant A tries to update tenant B's customer", async () => {
    await request(app.getHttpServer())
      .put(`/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ notes: 'attempted cross-tenant write' })
      .expect(404);
  });

  it("returns 404 when tenant A tries to delete tenant B's customer", async () => {
    await request(app.getHttpServer())
      .delete(`/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it("rejects a request whose X-Tenant-Id header disagrees with the caller's JWT tenant (403)", async () => {
    await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantB.id)
      .expect(403);
  });

  it("tenant B can read its own customer normally (isolation isn't just 'everything 404s')", async () => {
    const res = await request(app.getHttpServer())
      .get(`/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(res.body.id).toBe(customerB.id);
  });
});
