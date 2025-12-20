import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'http://localhost:3000', // Public website
      'http://localhost:3001', // Admin portal
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
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
  await app.listen(port);
  console.log(`🚀 DCMS Backend API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();

