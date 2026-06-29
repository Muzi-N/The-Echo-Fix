import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security headers.
  app.use(helmet());

  // URI versioning: routes live under /v1/...
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api', { exclude: [] });

  // Strict input validation: strip unknown props, reject extras, transform.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const corsOrigins = config.get<string[]>('app.corsOrigins') ?? ['*'];
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
  });

  app.enableShutdownHooks();

  // OpenAPI docs at /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ECHO API')
    .setDescription('ECHO messaging platform backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`ECHO API listening on port ${port}`);
  logger.log(`Swagger docs at /api/docs`);
}

void bootstrap();
