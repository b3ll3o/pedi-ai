import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

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

  const port = process.env.PORT || 3001;
  // HOST: 0.0.0.0 é intencional para Docker (container precisa escutar em todas as interfaces).
  // Em desenvolvimento local, defina HOST=127.0.0.1 para escutar apenas em localhost.
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port: Number(port), host });
  console.log(`🚀 API rodando em http://localhost:${port}`);
}

bootstrap();
