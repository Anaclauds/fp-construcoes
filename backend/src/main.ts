import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { parseTrustProxy } from './common/utils/trust-proxy.util';
import type { Application } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as Application;
  expressApp.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

  app.setGlobalPrefix('api');
  app.enableCors({ exposedHeaders: ['Content-Disposition'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FP Construcoes API')
    .setDescription('Backend do TCC FP Construcoes')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
