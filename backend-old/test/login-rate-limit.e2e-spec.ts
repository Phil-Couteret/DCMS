import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// bcrypt ships a native binary that isn't available in every environment;
// nothing here needs it to actually hash/compare (every request is either
// rejected for bad credentials or, eventually, for rate limiting).
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

/**
 * Phase 6.2 regression test: POST /users/login (and the other credential-
 * checking endpoints) must be rate limited, not just guarded. This proves
 * the LOGIN_THROTTLE override in users.controller.ts (10 requests/60s,
 * tighter than the app-wide 100/60s default in app.module.ts) actually
 * takes effect - a wrong password shouldn't be retriable without limit.
 */
describe('Login rate limiting (e2e)', () => {
  let app: INestApplication;

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(makePrismaStub())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects login attempts past the configured limit with 429, not endless 401s', async () => {
    const credentials = { username: 'someone', password: 'wrong-password' };
    const statuses: number[] = [];

    // LOGIN_THROTTLE allows 10/60s - fire 12 and expect the first 10 to be
    // normal auth failures (401, since the stubbed Prisma finds no user)
    // and at least the 11th/12th to be throttled (429).
    for (let i = 0; i < 12; i++) {
      const res = await request(app.getHttpServer()).post('/users/login').send(credentials);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10)).toEqual(new Array(10).fill(401));
    expect(statuses.slice(10)).toContain(429);
  });
});
