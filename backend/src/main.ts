import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - allow connections from localhost, local network, and production
  const localNetworkIP = process.env.LOCAL_NETWORK_IP || '192.168.18.254';
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  app.enableCors({
    origin: [
      ...corsOrigins,
      'http://localhost:3000',
      'http://localhost:3001',
      `http://${localNetworkIP}:3000`,
      `http://${localNetworkIP}:3001`, // Admin portal from network
      // Production: admin, dcms, api and multi-tenant subdomains (*.admin, *.dcms, *.api)
      /^https?:\/\/([a-z0-9-]+\.)*(admin|dcms|api)\.couteret\.fr(:\d+)?$/,
      /^https?:\/\/couteret\.fr(:\d+)?$/,
      // Allow any origin on local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/,
    ],
    credentials: true,
  });

  // Global exception filter to catch and log all errors
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Temporarily disabled to allow interfaces without decorators
      transform: true,
      disableErrorMessages: false,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('DCMS API')
    .setDescription('Dive Center Management System API Documentation')
    .setVersion('1.0')
    .addTag('bookings')
    .addTag('customers')
    .addTag('equipment')
    .addTag('consents')
    .addTag('audit')
    .addTag('dsar')
    .addTag('breaches')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port, '0.0.0.0'); // Listen on all network interfaces
  const localIP = process.env.LOCAL_NETWORK_IP || '192.168.18.254';
  console.log(`🚀 DCMS Backend API is running on:`);
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://${localIP}:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();

