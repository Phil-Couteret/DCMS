import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { corsOptions } from './tenant/tenant-host.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Dive log signatures are sent as encoded images and exceed the 100kb default.
  app.useBodyParser('json', { limit: '1mb' });
  // The fixed origins, and every center's own site ({slug}.<domain> for the
  // domains in TENANT_DOMAINS), whose browser code posts guest bookings.
  const origins = [
    process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    'http://10.10.10.1:3000',
    'http://10.10.10.1:3001',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  app.enableCors(corsOptions(origins));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
