import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const trustProxyRaw = (process.env.TRUST_PROXY || '').toLowerCase();
  if (trustProxyRaw === '1' || trustProxyRaw === 'true') {
    const instance = app.getHttpAdapter().getInstance();
    if (typeof instance?.set === 'function') {
      instance.set('trust proxy', 1);
    }
  }

  app.use(helmet());

  const bodyLimit = process.env.BODY_LIMIT || '100kb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  const corsOriginRaw = (process.env.CORS_ORIGIN || '*').trim();
  const isWildcardOrigin = corsOriginRaw === '*';
  const corsOrigin = isWildcardOrigin
    ? '*'
    : corsOriginRaw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: !isWildcardOrigin,
  });

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Logistics Service API')
    .setDescription('API for managing shipment orders and tracking')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Orders', 'Order management endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received. Starting graceful shutdown...');
    await app.close();
    logger.log('Application closed gracefully');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received. Starting graceful shutdown...');
    await app.close();
    logger.log('Application closed gracefully');
    process.exit(0);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`Health check: http://localhost:${port}/api/v1/health`);
}

bootstrap();
