import * as fs from 'fs';
import * as path from 'path';

// ─── OpenTelemetry DEVE ser importado ANTES de tudo (auditoria A2) ─
// Auto-instrumentations só capturam módulos carregados depois deste import.
import './tracing/tracing';

// v11+ do @fastify/cookie e v13+ do @fastify/helmet exportam o plugin como
// objeto com métodos auxiliares (.parse/.serialize) anexados, o que muda
// a tipagem do default export. Em runtime continua sendo uma função
// chamável; usamos cast para `any` para satisfazer a sobrecarga do `register()`.
import fastifyCookieImport from '@fastify/cookie';
import fastifyHelmetImport from '@fastify/helmet';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fastifyCookie: any = fastifyCookieImport;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fastifyHelmet: any = fastifyHelmetImport;
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import * as yaml from 'js-yaml';

import { AppModule } from './app.module';
import { TodasExcecoesFiltro } from './common/filters/TodasExcecoesFiltro';

/**
 * Valores permitidos para `NODE_ENV`. Falha o boot se ausente para garantir
 * que `isProd` no filtro de exceções nunca caia em modo dev por acidente.
 */
const ALLOWED_NODE_ENVS = ['production', 'staging', 'development', 'e2e'] as const;
type AllowedNodeEnv = (typeof ALLOWED_NODE_ENVS)[number];

function resolveNodeEnv(): AllowedNodeEnv {
  const raw = process.env.NODE_ENV;
  if (!raw || !ALLOWED_NODE_ENVS.includes(raw as AllowedNodeEnv)) {
    throw new Error(
      `NODE_ENV é obrigatório e deve ser um de: ${ALLOWED_NODE_ENVS.join(', ')}. ` +
        `Valor recebido: ${raw ?? '(vazio)'}`
    );
  }
  return raw as AllowedNodeEnv;
}

/**
 * CORS Origins configuráveis via env `ALLOWED_ORIGINS` (separadas por vírgula).
 *
 * ⚠️ Em produção, **NUNCA** use `0.0.0.0` ou `*`. Apenas origens explícitas.
 *
 * Validação rigorosa: split por `,` e trim. Se `ALLOWED_ORIGINS` ausente,
 * usa fallback `http://localhost:3000` (dev) ou falha (NODE_ENV=production).
 */
function resolveAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || raw.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ALLOWED_ORIGINS é obrigatório em produção (configure origens explícitas separadas por vírgula)'
      );
    }
    return ['http://localhost:3000'];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '0.0.0.0' && s !== '*');
}

/**
 * Logger do bootstrap. Declarado ANTES da função `bootstrap()` para que
 * os logs de sucesso (`API rodando em...`) usem o mesmo logger dos
 * handlers `uncaughtException`/`unhandledRejection`.
 */
const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap() {
  // ─── Validação rígida de NODE_ENV antes de tudo (C3) ─────────
  // Garante que filtros (TodasExcecoesFiltro) tenham modo de produção
  // confiável e evita deploy silencioso em modo dev com stack traces vazados.
  resolveNodeEnv();

  const adapter = new FastifyAdapter({
    logger: true,
    trustProxy: true, // Necessário para `req.ip` correto atrás de Nginx/proxy
  });

  // `bodyParser: false` desabilita o registro automático do parser
  // `application/json` que o Nest faria internamente — caso contrário
  // nosso parser customizado (registrado abaixo) colide e o Fastify
  // lança `FastifyError: Content type parser 'application/json' already present`
  // durante o init do NestApplication.
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bodyParser: false,
  });

  // Captura o raw body para a rota de webhook do Mercado Pago.
  // Necessário para validar a assinatura HMAC v1, que é calculada sobre
  // o body original (antes do parse JSON). Aplicamos em application/json
  // para que o controller de webhook possa acessar `req.rawBody`.
  // Fastify v5+: overload exige `parseAs` e `bodyLimit` ambos com chaves
  // próprias, mas a inferência do TS falha por causa de tipos condicionais
  // internos. Migramos para a forma async/await (suportada nativamente em
  // v5) para satisfazer a sobrecarga `(req, payload) => Promise<any>`.
  // O `rawBody` é anexado via cast porque o tipo `FastifyRequest` é
  // augmentado por plugins (cookie/jwt) e a intersecção manual conflita.
  //
  // IMPORTANTE: registrado APÓS NestFactory.create + bodyParser:false,
  // caso contrário o Nest já terá registrado um parser JSON padrão e o
  // Fastify lança o erro acima.
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      'application/json',
      { parseAs: 'string', bodyLimit: 1024 * 1024 },
      async (req, payload): Promise<unknown> => {
        const raw = typeof payload === 'string' ? payload : payload.toString('utf8');
        (req as FastifyRequest & { rawBody?: Buffer }).rawBody = Buffer.from(raw, 'utf8');
        return raw.length > 0 ? JSON.parse(raw) : {};
      }
    );

  // ─── Cookies (necessário para o fluxo de auth com tokens HttpOnly) ───
  await app.register(fastifyCookie, {});

  // ─── Helmet: Security Headers (CSP, HSTS, X-Frame-Options, etc.) ───
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.mercadopago.com'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    // 'cross-origin' permite que subdomínios diferentes (ex: app.pedi-ai.com
    // consumindo api.pedi-ai.com) carreguem recursos. 'same-site' quebra
    // cenários legítimos em produção.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
  });

  // ─── CORS (origens validadas, sem `*` ou `0.0.0.0`) ───
  app.enableCors({
    origin: resolveAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ─── Validação global ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    })
  );

  app.useGlobalFilters(new TodasExcecoesFiltro());

  // ─── Graceful shutdown (A4) ─────────────────────────────────
  // Habilita hooks do Nest para fechar Prisma/BullMQ/etc. em ordem
  // durante SIGTERM (rolling deploy K8s, docker stop, etc).
  app.enableShutdownHooks();

  // ─── Swagger/OpenAPI ───
  // Auditoria ACHADO-N1 (Re-varredura 8): Swagger UI e dump do openapi.yaml
  // DEVEM ser restritos a development/staging. Em produção, expor toda a
  // superfície da API (incluindo /payments/webhooks/pix, /auth/refresh,
  // /auth/reset-password) é vetor de information disclosure e enumeration.
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const swaggerEnabled = nodeEnv !== 'production';

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

  // Dump do spec apenas em dev/staging (info disclosure em prod).
  if (swaggerEnabled) {
    const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
    fs.writeFileSync(specPath, yaml.dump(document, { indent: 2 }));
  }

  // Setup do UI apenas em dev/staging.
  if (swaggerEnabled) {
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: false },
    });
  }

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port: Number(port), host });

  // Auditoria ACHADO-N40 (Re-varredura 9): usar `bootstrapLogger` (já criado)
  // em vez de `console.log` — alinha com o resto do bootstrap (uncaught
  // exception, unhandled rejection) e permite que agregadores de log
  // capturem contexto estruturado.
  bootstrapLogger.log(`API rodando em http://localhost:${port}`);
  if (swaggerEnabled) {
    bootstrapLogger.log(`Swagger docs em http://localhost:${port}/api/docs`);
  } else {
    bootstrapLogger.log(`Swagger UI desabilitado (NODE_ENV=${nodeEnv})`);
  }
}

/**
 * Handlers globais para garantir visibilidade de falhas catastróficas.
 * O Nest já tem `enableShutdownHooks()` (A4) para SIGTERM/SIGINT, mas
 * exceções não-tratadas em promises/código síncrono bypassariam o filtro.
 *
 * Política:
 * - Logar stack completo (via `Logger.error`).
 * - Encerrar com exit code != 0 para que orquestrador (K8s, systemd)
 *   marque o pod como falho e dispare reinício/rolling deploy.
 */
process.on('uncaughtException', (err) => {
  bootstrapLogger.error('uncaughtException — encerrando processo', err.stack ?? String(err));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  bootstrapLogger.error(
    'unhandledRejection — encerrando processo',
    reason instanceof Error ? reason.stack : String(reason)
  );
  process.exit(1);
});

bootstrap().catch((err) => {
  bootstrapLogger.error('Falha no bootstrap', err.stack ?? String(err));
  process.exit(1);
});
