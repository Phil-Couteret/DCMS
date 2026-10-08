import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { corsOptions } from './tenant/tenant-host.js';

// ALLOWED_ORIGINS: the browser origins that may call the API, comma-separated
// (e.g. "https://dcms.couteret.fr"). Every center's own site
// ({slug}.<domain> for the domains in TENANT_DOMAINS) is allowed as well.
function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

// TRUST_PROXY: Express's "trust proxy" setting, for the proxies in front of
// the API (nginx, and the Next.js servers calling it). Rate limits count
// requests per client IP, which is only right when the API knows which
// X-Forwarded-For hops to believe: a number of hops ("1"), "true", or
// address names ("loopback, uniquelocal"). Unset: no proxy is trusted.
function trustProxy(): boolean | number | string | undefined {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const proxy = trustProxy();
  if (proxy !== undefined) app.set('trust proxy', proxy);
  // Security headers. The API answers JSON only, so helmet's defaults (a
  // strict content security policy, no framing, nosniff, HSTS) fit as is.
  app.use(helmet());
  // Dive log signatures are sent as encoded images and exceed the 100kb default.
  app.useBodyParser('json', { limit: '1mb' });
  app.enableCors(corsOptions(allowedOrigins()));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
