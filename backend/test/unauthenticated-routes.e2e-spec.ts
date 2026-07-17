import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA, GUARDS_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';

// bcrypt ships a native binary that isn't available in every environment;
// nothing in this suite needs it to actually hash/compare anything (every
// route under test gets rejected before a service method runs), so stub it
// out rather than let an unrelated import crash the app.
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

/**
 * This is the regression test for the Phase 0 bug: a controller that never
 * got the global JwtAuthGuard (or an explicit @Public() marker) applied,
 * silently serving authenticated data to anyone. Rather than hand-listing
 * routes (which would only ever check the routes someone remembered to
 * list), this walks every controller Nest actually registered - via the
 * same DiscoveryService/MetadataScanner Nest itself uses - and asserts
 * every route requiring some form of credential (admin JWT via the global
 * guard, or a partner API key/JWT via an explicit @UseGuards() on a
 * @Public() controller like partner/*) rejects a request with none. A new
 * controller or endpoint added later is covered automatically, with no
 * change needed to this file.
 *
 * @Public() alone doesn't mean "no auth" - it means "skip the global admin
 * guard". partner/*, partner/bookings, partner/customers, and
 * partner-invoices/my-invoices are all @Public() from the admin guard's
 * perspective but carry their own @UseGuards(PartnerAuthGuard |
 * JwtPartnerGuard), which still 401s a credential-less request. So "fully
 * open" is @Public() AND no @UseGuards() at any level - that's just
 * AppController (root/health) and the two login endpoints.
 */

const HTTP_METHOD_NAMES: Partial<Record<RequestMethod, 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'>> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.OPTIONS]: 'options',
  [RequestMethod.HEAD]: 'head',
};

interface DiscoveredRoute {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
  path: string;
  /** True only if genuinely reachable with no credentials of any kind. */
  isFullyOpen: boolean;
  controllerName: string;
  handlerName: string;
}

function joinPath(controllerPath: string | string[] | undefined, methodPath: string | string[] | undefined): string {
  const c = (Array.isArray(controllerPath) ? controllerPath[0] : controllerPath) || '';
  const m = (Array.isArray(methodPath) ? methodPath[0] : methodPath) || '';
  let full = `/${c}/${m}`.replace(/\/+/g, '/');
  if (full.length > 1) full = full.replace(/\/$/, '');
  // Replace path params (:id, :bookingId, etc.) with a syntactically valid
  // placeholder - we only care that the route matches for routing/guard
  // purposes, not that the resource actually exists.
  full = full.replace(/:[^/]+/g, 'e2e-placeholder-id');
  return full || '/';
}

function discoverRoutes(
  discovery: DiscoveryService,
  scanner: MetadataScanner,
  reflector: Reflector,
): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = [];

  for (const wrapper of discovery.getControllers()) {
    const { instance, metatype } = wrapper;
    if (!instance || !metatype) continue;

    const controllerPath = Reflect.getMetadata(PATH_METADATA, metatype);
    const classIsPublic = !!reflector.get<boolean>(IS_PUBLIC_KEY, metatype);
    const classGuards = Reflect.getMetadata(GUARDS_METADATA, metatype) || [];
    const prototype = Object.getPrototypeOf(instance);

    for (const handlerName of scanner.getAllMethodNames(prototype)) {
      const handler = prototype[handlerName];
      const methodPath = Reflect.getMetadata(PATH_METADATA, handler);
      const requestMethod: RequestMethod | undefined = Reflect.getMetadata(METHOD_METADATA, handler);
      if (methodPath === undefined || requestMethod === undefined) continue; // not a route handler

      const handlerIsPublic = !!reflector.get<boolean>(IS_PUBLIC_KEY, handler);
      const handlerGuards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
      const isPublic = classIsPublic || handlerIsPublic;
      const hasOwnGuard = classGuards.length > 0 || handlerGuards.length > 0;

      routes.push({
        method: HTTP_METHOD_NAMES[requestMethod] ?? 'get',
        path: joinPath(controllerPath, methodPath),
        isFullyOpen: isPublic && !hasOwnGuard,
        controllerName: metatype.name,
        handlerName,
      });
    }
  }

  return routes;
}

/** Minimal Prisma stand-in: every route under test is rejected by the guard
 * before any service method runs, so nothing here needs to return real
 * data - it just needs to exist so Nest can construct the app. */
function makePrismaStub() {
  const modelStub = new Proxy(
    {},
    { get: () => jest.fn().mockResolvedValue(null) },
  );
  const base = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      return modelStub;
    },
  });
}

describe('Every controller requires auth unless @Public() (e2e)', () => {
  let app: INestApplication;
  let routes: DiscoveredRoute[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule, AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(makePrismaStub())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    routes = discoverRoutes(
      moduleFixture.get(DiscoveryService),
      moduleFixture.get(MetadataScanner),
      moduleFixture.get(Reflector),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('discovered a realistic number of routes (sanity check that discovery itself works)', () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it('found some fully-open routes and some that require auth (sanity check on the classification itself)', () => {
    expect(routes.some((r) => r.isFullyOpen)).toBe(true);
    expect(routes.some((r) => !r.isFullyOpen)).toBe(true);
  });

  it('rejects every route that requires credentials with 401 when none are sent', async () => {
    const guardedRoutes = routes.filter((r) => !r.isFullyOpen);
    expect(guardedRoutes.length).toBeGreaterThan(100);

    const failures: string[] = [];
    for (const route of guardedRoutes) {
      const res = await request(app.getHttpServer())[route.method](route.path);
      if (res.status !== 401) {
        failures.push(
          `${route.controllerName}.${route.handlerName} [${route.method.toUpperCase()} ${route.path}] -> expected 401, got ${res.status}`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(`${failures.length} route(s) did not reject a credential-less request:\n${failures.join('\n')}`);
    }
  });

  it('does not 401 the handful of genuinely open routes (root/health, login endpoints)', async () => {
    const openRoutes = routes.filter((r) => r.isFullyOpen);
    expect(openRoutes.length).toBeGreaterThanOrEqual(4); // AppController (root/health) + 3 login handlers

    for (const route of openRoutes) {
      const res = await request(app.getHttpServer())[route.method](route.path);
      // No specific success status asserted - an empty-body POST to a
      // login endpoint legitimately fails DTO validation (400). What must
      // NOT happen is 401, since that status is guard territory and these
      // routes are deliberately unguarded.
      expect(res.status).not.toBe(401);
    }
  });
});
