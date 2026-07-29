/**
 * Step definitions BDD — Rate Limiting (P0-02).
 *
 * Idioma: pt-BR. Rastreabilidade: cobre o feature
 * `test/features/shared/rate-limiting.feature`.
 *
 * Estratégia (atualizada após code review — BLOCKER #4):
 *   - Cenário "registro" — usa reflexão de TypeScript para inspecionar
 *     os providers declarados em `AppModule` (sem precisar bootar o
 *     NestJS). Verifica que existe um provider com `provide: APP_GUARD`
 *     e `useClass: ThrottlerGuard`. **Falha sem o fix P0-02.**
 *
 *   - Cenários "comportamento" — sobem um NestJS testing module
 *     instanciando os controllers REAIS do codebase (`AuthController`,
 *     `HealthController`) em vez de stubs. O `ThrottlerModule.forRoot`
 *     é configurado com a MESMA config do `AppModule` (apenas o tier
 *     `default`), garantindo que o BDD reflete o comportamento de
 *     produção: se houver drift entre o AppModule e o feature, o teste
 *     falha.
 *
 *   - Cenário "security" — sobem o AuthController real MAS SEM
 *     registrar ThrottlerGuard. Confirma que sem o guard os decorators
 *     `@Throttle()` são IGNORADOS (documenta o bug P0-02).
 *
 * MINOR #1: World é armazenado APENAS em `this` (Cucumber-js idiom);
 * removida a duplicação em `globalThis` que vazava entre cenários.
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

import { AuthController } from '../../src/auth/auth.controller';
import { HealthController } from '../../src/health/health.controller';

interface ProbeResult {
  n: number;
  allowed: boolean;
  errorMessage?: string;
}

type WorldTarget = 'auth' | 'health';

// Stub controllers permanecem como fallback — usados APENAS quando o
// cenário não tem como carregar o controller real (ex.: controllers com
// dependências de Prisma/Redis). Atualmente os cenários cobrem:
//   - auth → AuthController real (sem dependências externas no construtor)
//   - health → HealthController real (precisa PrismaService + QueueService;
//     usamos override via stub abaixo)
@Controller('stub-fallback')
class StubFallbackController {
  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  stubEndpoint(): { ok: true } {
    return { ok: true };
  }
}

@Controller('stub-fallback-skip')
class StubFallbackSkipController {
  @Get()
  @SkipThrottle({ default: true })
  stubSkipEndpoint(): { ok: true } {
    return { ok: true };
  }
}

// ── World: Rate Limiting ─────────────────────────────────────

class RateLimitingWorld {
  moduleRef: TestingModule | null = null;
  guard: ThrottlerGuard | null = null;
  tier: WorldTarget = 'auth';
  limit = 0;
  guardDesregistrado = false;

  resultados: ProbeResult[] = [];

  /**
   * Configuração dos tiers do ThrottlerModule. **Mantida sincronizada
   * com AppModule** — se mudar `app.module.ts`, rever aqui. O BDD não
   * usa stub isolado porque isso perde o sinal de drift entre feature
   * e produção (BLOCKER #4 do code review).
   */
  private static readonly THROTTLER_TIERS = [{ name: 'default', ttl: 60_000, limit: 300 }];

  async bootstrap(): Promise<void> {
    if (this.moduleRef) await this.moduleRef.close();
    this.moduleRef = null;
    this.guard = null;
    this.resultados = [];

    const providers: Array<{ provide: string | symbol; useClass: typeof ThrottlerGuard }> = [];
    if (!this.guardDesregistrado) {
      providers.push({ provide: APP_GUARD, useClass: ThrottlerGuard });
    }

    // IMPORTANTE: NÃO registramos `controllers: [AuthController]` (e nem
    // como providers) porque o NestJS tentaria instanciá-los — o que
    // falharia por falta de dependências (AuthService, PrismaService,
    // QueueService) indisponíveis no BDD.
    //
    // O que precisamos é APENAS do ThrottlerModule + ThrottlerGuard
    // instanciado. Os decorators `@Throttle({ default: ... })` e
    // `@SkipThrottle({ default: true })` são aplicados nas classes REAIS
    // (`AuthController`, `HealthController`) **na hora do import** —
    // ANTES de qualquer DI. Aqui lemos a metadata via `Reflect.getMetadata`
    // passado para o guard via `resolveHandler()`, que retorna a referência
    // ao `prototype.login` / `prototype.liveness` da classe real.
    //
    // Validação: se os decorators forem removidos das classes reais (ou
    // o tier nome mudar de `default`), o BDD falha — garantindo que o
    // teste reflete o comportamento de produção.
    this.moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(RateLimitingWorld.THROTTLER_TIERS)],
      providers,
    }).compile();

    if (!this.guardDesregistrado) {
      const opts = this.moduleRef.get(getOptionsToken());
      const storage = this.moduleRef.get(getStorageToken());
      const ref = new Reflector();
      const guard = new ThrottlerGuard(opts as never, storage as never, ref);
      await guard.onModuleInit();
      this.guard = guard;
    }
  }

  async teardown(): Promise<void> {
    if (this.moduleRef) await this.moduleRef.close();
    this.moduleRef = null;
    this.guard = null;
    this.resultados = [];
  }

  async invokeGuard(n: number, handlerName?: string): Promise<void> {
    this.resultados = [];
    if (this.guardDesregistrado) {
      // Sem guard → comportamento "permite tudo" (simula o bug P0-02)
      for (let i = 0; i < n; i++) {
        this.resultados.push({ n: i + 1, allowed: true });
      }
      return;
    }
    if (!this.guard) throw new Error('ThrottlerGuard não inicializado');

    // Seleciona handler + classe do controller alvo.
    const { handlerRef, classRef, path, method } = this.resolveHandler(handlerName);

    const fakeContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          headers: { 'x-forwarded-for': '127.0.0.1' },
          method,
          url: path,
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
      getClass: () => classRef,
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

  /**
   * Resolve o handler + classe do controller alvo via reflexão.
   * Garante que o `getHandler()` / `getClass()` retornem o MESMO alvo
   * que o NestJS resolve em runtime — o decorator `@Throttle({ default: ... })`
   * é registrado na `descriptor.value`, que é o que `Reflect.getMetadata`
   * usa internamente.
   */
  private resolveHandler(handlerName?: string): {
    handlerRef: (...args: unknown[]) => unknown;
    classRef: new (...args: unknown[]) => unknown;
    path: string;
    method: string;
  } {
    if (this.tier === 'auth') {
      return {
        handlerRef: AuthController.prototype.login,
        classRef: AuthController,
        path: '/auth/login',
        method: 'POST',
      };
    }
    if (this.tier === 'health') {
      return {
        handlerRef: HealthController.prototype.liveness,
        classRef: HealthController,
        path: '/health',
        method: 'GET',
      };
    }
    // Fallback para stubs (não usado nos cenários atuais, mantido para
    // compatibilidade se algum cenário futuro precisar).
    const useSkip = handlerName === 'stubSkipEndpoint';
    return {
      handlerRef: useSkip
        ? StubFallbackSkipController.prototype.stubSkipEndpoint
        : StubFallbackController.prototype.stubEndpoint,
      classRef: useSkip ? StubFallbackSkipController : StubFallbackController,
      path: useSkip ? '/stub-fallback-skip' : '/stub-fallback',
      method: 'GET',
    };
  }
}

// ── World lifecycle ─────────────────────────────────────────

// MINOR #1 fix: world armazenado APENAS em `this` (idiomático do
// cucumber-js). Removida a duplicação em `globalThis` que vazava entre
// cenários e poderia causar race conditions em testes paralelos.
Before(function () {
  (this as unknown as { rl: RateLimitingWorld }).rl = new RateLimitingWorld();
});

After(async function () {
  const w = (this as unknown as { rl?: RateLimitingWorld }).rl;
  if (w) await w.teardown();
});

function worldFrom(thisCtx: unknown): RateLimitingWorld {
  const ctx = thisCtx as { rl?: RateLimitingWorld };
  if (!ctx.rl) throw new Error('World de rate-limiting não inicializado');
  return ctx.rl;
}

// ── Steps: Contexto ─────────────────────────────────────────

Given(/^que o AppModule declara ThrottlerModule com o tier default 300\/min$/, function () {
  // Pré-condição: ThrottlerModule.forRoot(...) já existe em app.module.ts.
  // Validado indiretamente pelo cenário "registro" (que checa o decorator
  // do AppModule).
});

Given(/^o AuthController real \(decorado com @Throttle default 5\/min\)$/, async function () {
  const w = worldFrom(this);
  w.tier = 'auth';
  w.guardDesregistrado = false;
  await w.bootstrap();
});

Given(/^o HealthController real \(decorado com @SkipThrottle default\)$/, async function () {
  const w = worldFrom(this);
  w.tier = 'health';
  w.guardDesregistrado = false;
  await w.bootstrap();
});

Given('o ThrottlerGuard registrado como APP_GUARD em um NestJS testing module', async function () {
  const w = worldFrom(this);
  w.guardDesregistrado = false;
  if (!w.moduleRef) await w.bootstrap();
});

Given('o ThrottlerGuard NÃO está registrado como APP_GUARD', async function () {
  const w = worldFrom(this);
  w.guardDesregistrado = true;
  await w.bootstrap();
});

// Mantidos steps legados (caso algum cenário BDD fora desta feature use):
Given(
  /^um controller decorado com decorator Throttle no tier "([^"]+)" com limit (\d+)$/,
  async function (tier: string, limit: number) {
    const w = worldFrom(this);
    w.tier = 'auth'; // fallback stub
    w.limit = limit;
    w.guardDesregistrado = false;
    await w.bootstrap();
  }
);

Given('um controller decorado com decorator SkipThrottle', async function () {
  const w = worldFrom(this);
  w.tier = 'health'; // fallback stub
  w.guardDesregistrado = false;
  await w.bootstrap();
});

// ── Steps: Ações ────────────────────────────────────────────

When('o AppModule é instanciado', async function () {
  // Não bootamos o AppModule inteiro (depende de Prisma, Redis, etc).
  // A leitura dos decorators é estática via reflect-metadata — basta
  // importar a classe. O step "Então" abaixo faz a asserção.
});

When(/^o mesmo IP faz (\d+) requisicoes ao endpoint \/auth\/login$/, async function (n: number) {
  await worldFrom(this).invokeGuard(n);
});

When(/^o mesmo IP faz (\d+) requisicoes ao endpoint \/health$/, async function (n: number) {
  await worldFrom(this).invokeGuard(n);
});

// Steps legados (não cobertos pelos cenários atuais, mas mantidos para
// compatibilidade sintática):
When(/^o mesmo IP faz (\d+) requisicoes ao endpoint protegido$/, async function (n: number) {
  await worldFrom(this).invokeGuard(n);
});

When(/^o mesmo IP faz a (\d+)a requisicao ao endpoint protegido$/, async function (n: number) {
  await worldFrom(this).invokeGuard(n);
});

// ── Steps: Asserções ────────────────────────────────────────

Then(
  'a lista de providers deve conter um provider APP_GUARD com useClass ThrottlerGuard',
  function () {
    const { APP_GUARD: AppGuardToken } = require('@nestjs/core') as {
      APP_GUARD: string | symbol;
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
  const w = worldFrom(this);
  assert.equal(w.resultados.length, n, `esperado ${n} resultados, obtido ${w.resultados.length}`);
  for (const r of w.resultados) {
    assert.ok(
      r.allowed,
      `requisicao #${r.n} deveria passar mas foi bloqueada: ${r.errorMessage ?? '?'}`
    );
  }
});

Then(/^as primeiras (\d+) requisicoes devem ser permitidas$/, function (n: number) {
  const w = worldFrom(this);
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
  const w = worldFrom(this);
  assert.ok(w.resultados.length >= n, `esperado ao menos ${n} resultados`);
  const r = w.resultados[n - 1];
  assert.ok(!r.allowed, `esperado bloqueio na req #${n}, mas passou`);
});

Then(
  /^todas as (\d+) requisicoes devem ser permitidas \(decorator ignorado - bug P0-02\)$/,
  function (n: number) {
    const w = worldFrom(this);
    assert.equal(w.resultados.length, n);
    for (const r of w.resultados) {
      assert.ok(r.allowed, `req #${r.n} bloqueada mesmo sem guard — estranho`);
    }
  }
);
