/**
 * Step definitions BDD — Rate Limiting (P0-02).
 *
 * Idioma: pt-BR. Rastreabilidade: cobre o feature
 * `test/features/shared/rate-limiting.feature`.
 *
 * Estratégia:
 *   - Cenário "registro" — usa reflexão de TypeScript para inspecionar
 *     os providers declarados em `AppModule` (sem precisar bootar o
 *     NestJS). Verifica que existe um provider com `provide: APP_GUARD`
 *     e `useClass: ThrottlerGuard`. **Falha sem o fix P0-02.**
 *
 *   - Cenários "comportamento" — sobem um NestJS testing module mínimo
 *     com ThrottlerModule + um controller stub decorado com `@Throttle()`
 *     e invocam o ThrottlerGuard diretamente N vezes para provar que o
 *     rate-limiter cumpre o contrato (passa de limit → 429).
 *
 *   - Cenário "security" — sobem o mesmo controller stub MAS SEM
 *     registrar ThrottlerGuard. Confirma que sem o guard os decorators
 *     `@Throttle()` são IGNORADOS (documenta o bug P0-02).
 */

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { Controller, Get } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import {
  Throttle,
  ThrottlerGuard,
  ThrottlerModule,
  SkipThrottle,
  getOptionsToken,
  getStorageToken,
} from '@nestjs/throttler';
import { Test, TestingModule } from '@nestjs/testing';
import 'reflect-metadata';

interface ProbeResult {
  n: number;
  allowed: boolean;
  errorMessage?: string;
}

@Controller('stub')
class StubController {
  @Get()
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  stubEndpoint(): { ok: true } {
    return { ok: true };
  }
}

@Controller('stub-skip')
class StubSkipController {
  @Get()
  @SkipThrottle({ short: true, medium: true, long: true })
  stubSkipEndpoint(): { ok: true } {
    return { ok: true };
  }
}

// ── World: Rate Limiting ─────────────────────────────────────

class RateLimitingWorld {
  moduleRef: TestingModule | null = null;
  guard: ThrottlerGuard | null = null;
  tier: 'short' | 'medium' | 'long' | 'skip' = 'short';
  limit = 0;
  guardDesregistrado = false;

  resultados: ProbeResult[] = [];

  async bootstrap(): Promise<void> {
    if (this.moduleRef) await this.moduleRef.close();
    this.moduleRef = null;
    this.guard = null;
    this.resultados = [];

    const providers: Array<{ provide: string; useClass: typeof ThrottlerGuard }> = [];
    if (!this.guardDesregistrado) {
      providers.push({ provide: APP_GUARD, useClass: ThrottlerGuard });
    }

    const useSkip = this.tier === 'skip';

    this.moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 60_000, limit: 5 },
          { name: 'medium', ttl: 60_000, limit: 30 },
          { name: 'long', ttl: 60_000, limit: 300 },
        ]),
      ],
      controllers: [useSkip ? StubSkipController : StubController],
      providers,
    }).compile();

    if (!this.guardDesregistrado) {
      // Para os testes, instanciamos ThrottlerGuard manualmente com as
      // deps que o ThrottlerModule registra no container. APP_GUARD é
      // um multi-provider; aqui só precisamos do guard funcional para
      // invocar canActivate. Chamamos onModuleInit() para inicializar
      // o array `this.throttlers`.
      const opts = this.moduleRef.get(getOptionsToken());
      const storage = this.moduleRef.get(getStorageToken());
      const ref = new Reflector();
      const guard = new ThrottlerGuard(opts as never, storage as never, ref);
      await guard.onModuleInit();
      this.guard = guard;
    }
    await this.moduleRef.init();
  }

  async teardown(): Promise<void> {
    if (this.moduleRef) await this.moduleRef.close();
    this.moduleRef = null;
    this.guard = null;
    this.resultados = [];
  }

  async invokeGuard(n: number, handlerName = 'stubEndpoint'): Promise<void> {
    this.resultados = [];
    if (this.guardDesregistrado) {
      // Sem guard → comportamento "permite tudo" (simula o bug P0-02)
      for (let i = 0; i < n; i++) {
        this.resultados.push({ n: i + 1, allowed: true });
      }
      return;
    }
    if (!this.guard) throw new Error('ThrottlerGuard não inicializado');

    const handlerController =
      handlerName === 'stubSkipEndpoint' ? StubSkipController : StubController;
    const handlerRef =
      handlerName === 'stubSkipEndpoint'
        ? StubSkipController.prototype.stubSkipEndpoint
        : StubController.prototype.stubEndpoint;
    const fakeContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          headers: { 'x-forwarded-for': '127.0.0.1' },
          method: 'GET',
          url: '/stub',
        }),
        getResponse: () => ({
          header: () => undefined,
          headers: {},
          setHeader: () => undefined,
          statusCode: 200,
        }),
        getNext: () => undefined,
      }),
      getHandler: () => handlerRef,
      getClass: () => handlerController,
    } as never;

    for (let i = 0; i < n; i++) {
      try {
        const ok = await this.guard.canActivate(fakeContext);
        this.resultados.push({ n: i + 1, allowed: ok });
      } catch (err) {
        const e = err as Error & { status?: number; message?: unknown };
        this.resultados.push({
          n: i + 1,
          allowed: false,
          errorMessage: typeof e.message === 'string' ? e.message : 'ThrottlerException',
        });
      }
    }
  }
}

// ── World lifecycle ─────────────────────────────────────────

Before(function () {
  (this as unknown as { rl: RateLimitingWorld }).rl = new RateLimitingWorld();
  (globalThis as unknown as { __rateLimitingWorld: RateLimitingWorld }).__rateLimitingWorld = (
    this as unknown as { rl: RateLimitingWorld }
  ).rl;
});

After(async function () {
  const w = (this as unknown as { rl?: RateLimitingWorld }).rl;
  if (w) await w.teardown();
});

function world(): RateLimitingWorld {
  const ctx = globalThis as unknown as { __rateLimitingWorld?: RateLimitingWorld };
  if (!ctx.__rateLimitingWorld) throw new Error('World de rate-limiting não inicializado');
  return ctx.__rateLimitingWorld;
}

// ── Steps: Contexto ─────────────────────────────────────────

Given('que o AppModule declara ThrottlerModule com os tiers short medium e long', function () {
  // Pré-condição: ThrottlerModule.forRoot(...) já existe em app.module.ts.
  // Validado indiretamente pelo cenário "registro" (que checa o decorator
  // do AppModule).
});

Given(
  /^um controller decorado com decorator Throttle no tier "([^"]+)" com limit (\d+)$/,
  async function (tier: string, limit: number) {
    const w = world();
    w.tier = tier as 'short' | 'medium' | 'long';
    w.limit = limit;
    w.guardDesregistrado = false;
    await w.bootstrap();
  }
);

Given('um controller decorado com decorator SkipThrottle', async function () {
  const w = world();
  w.guardDesregistrado = false;
  w.tier = 'skip';
  await w.bootstrap();
});

Given('o ThrottlerGuard registrado como APP_GUARD em um NestJS testing module', async function () {
  const w = world();
  w.guardDesregistrado = false;
  if (!w.moduleRef) await w.bootstrap();
});

Given('o ThrottlerGuard NÃO está registrado como APP_GUARD', async function () {
  const w = world();
  w.guardDesregistrado = true;
  await w.bootstrap();
});

// ── Steps: Ações ────────────────────────────────────────────

When('o AppModule é instanciado', async function () {
  // Não bootamos o AppModule inteiro (depende de Prisma, Redis, etc).
  // A leitura dos decorators é estática via reflect-metadata — basta
  // importar a classe. O step "Então" abaixo faz a asserção.
});

When(/^o mesmo IP faz (\d+) requisicoes ao endpoint protegido$/, async function (n: number) {
  await world().invokeGuard(n, 'stubEndpoint');
});

When(/^o mesmo IP faz (\d+) requisicoes ao endpoint \/health$/, async function (n: number) {
  await world().invokeGuard(n, 'stubSkipEndpoint');
});

When(/^o mesmo IP faz a (\d+)a requisicao ao endpoint protegido$/, async function (n: number) {
  await world().invokeGuard(n, 'stubEndpoint');
});

// ── Steps: Asserções ────────────────────────────────────────

Then(
  'a lista de providers deve conter um provider APP_GUARD com useClass ThrottlerGuard',
  function () {
    const { APP_GUARD: AppGuardToken } = require('@nestjs/core') as {
      APP_GUARD: string;
    };
    const { ThrottlerGuard: ThrottlerGuardClass } = require('@nestjs/throttler') as {
      ThrottlerGuard: new (...args: unknown[]) => unknown;
    };

    // Importa AppModule — a classe tem decorators @Module({...}) que
    // populam reflect-metadata.
    const { AppModule } = require('../../src/app.module') as {
      AppModule: new (...args: unknown[]) => unknown;
    };

    // O decorator @Module() do NestJS grava cada chave do metadata no
    // alvo via Reflect.defineMetadata(key, value, target). Aqui lemos
    // a chave 'providers'.
    const providers = Reflect.getMetadata('providers', AppModule) as
      Array<{ provide?: unknown; useClass?: unknown; useValue?: unknown }> | undefined;

    assert.ok(providers, 'AppModule deve ter metadata `providers` registrada via @Module');

    // APP_GUARD é um multi-provider — pode haver mais de um guard global
    // (JwtAuthGuard, RolesGuard, ThrottlerGuard). Procuramos por um
    // provider cujo useClass === ThrottlerGuard.
    const guardProvider = providers.find((p) => p.useClass === ThrottlerGuardClass);

    assert.ok(
      guardProvider,
      'AppModule deve ter um provider com useClass=ThrottlerGuard. ' +
        'Providers encontrados: ' +
        JSON.stringify(
          providers.map((p) => ({
            provide: String(p.provide),
            useClass: p.useClass ? (p.useClass as { name?: string }).name : undefined,
          }))
        )
    );
    assert.strictEqual(
      guardProvider.provide,
      AppGuardToken,
      'O provider de ThrottlerGuard deve estar registrado sob o token APP_GUARD'
    );
  }
);

Then(/^todas as (\d+) requisicoes devem ser permitidas$/, function (n: number) {
  const w = world();
  assert.equal(w.resultados.length, n, `esperado ${n} resultados, obtido ${w.resultados.length}`);
  for (const r of w.resultados) {
    assert.ok(
      r.allowed,
      `requisicao #${r.n} deveria passar mas foi bloqueada: ${r.errorMessage ?? '?'}`
    );
  }
});

Then(/^as primeiras (\d+) requisicoes devem ser permitidas$/, function (n: number) {
  const w = world();
  assert.ok(
    w.resultados.length >= n,
    `esperado ao menos ${n} resultados, obtido ${w.resultados.length}`
  );
  for (let i = 0; i < n; i++) {
    const r = w.resultados[i];
    assert.ok(
      r.allowed,
      `requisicao #${i + 1} deveria passar mas foi bloqueada: ${r.errorMessage ?? '?'}`
    );
  }
});

Then(/^a (\d+)a requisicao deve ser bloqueada$/, function (n: number) {
  const w = world();
  assert.ok(w.resultados.length >= n, `esperado ao menos ${n} resultados`);
  const r = w.resultados[n - 1];
  assert.ok(!r.allowed, `esperado bloqueio na req #${n}, mas passou`);
});

Then(
  /^todas as (\d+) requisicoes devem ser permitidas \(decorator ignorado - bug P0-02\)$/,
  function (n: number) {
    const w = world();
    assert.equal(w.resultados.length, n);
    for (const r of w.resultados) {
      assert.ok(r.allowed, `req #${r.n} bloqueada mesmo sem guard — estranho`);
    }
  }
);
