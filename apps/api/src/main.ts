import * as fs from 'fs';
import * as path from 'path';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';

import { AppModule } from './app.module';
import { TodasExcecoesFiltro } from './common/filters/TodasExcecoesFiltro';
import { RespostaSucessoInterceptor } from './common/interceptors/RespostaSucessoInterceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    })
  );

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new TodasExcecoesFiltro());
  app.useGlobalInterceptors(new RespostaSucessoInterceptor());

  // Swagger/OpenAPI - contract-first documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pedi-AI API')
    .setDescription('API REST para sistema de cardápio digital')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
    .addTag('auth', 'Autenticação e autorização')
    .addTag('restaurants', 'Gerenciamento de restaurantes')
    .addTag('categories', 'Categorias de produtos')
    .addTag('products', 'Produtos do cardápio')
    .addTag('orders', 'Pedidos')
    .addTag('payments', 'Pagamentos PIX')
    .addTag('users', 'Usuários e perfis')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Exporta OpenAPI spec para arquivo (para contract testing com Dredd)
  const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
  fs.writeFileSync(specPath, yaml.dump(document, { indent: 2 }));

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port: Number(port), host });
  console.log(`🚀 API rodando em http://localhost:${port}`);
  console.log(`📚 Swagger docs em http://localhost:${port}/api/docs`);
}

bootstrap();
