import { describe, it, expect } from 'vitest';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';
import 'reflect-metadata';

/**
 * Teste de regressão para o fix **P0-02 (auditoria 2026-07-29)**:
 * garante que `ThrottlerGuard` está registrado como `APP_GUARD` no
 * `AppModule`, honrando assim todos os `@Throttle()` decorators da API.
 *
 * Sem este provider, o `ThrottlerModule` é importado mas NUNCA é
 * invocado — decorators `@Throttle()` viram no-ops, expondo login
 * e webhook a brute-force.
 *
 * Estratégia: ler a metadata do decorator `@Module()` sem instanciar
 * o AppModule (que requer DB, Redis, JWT keys, etc). Como o decorator
 * é avaliado na hora do import, `Reflect.getMetadata` está disponível
 * sem precisar do NestJS bootar o container.
 *
 * Para o cenário comportamental ponta-a-ponta (guard bloqueia além
 * do limite), ver BDD `test/features/shared/rate-limiting.feature`.
 */

interface ModuleProvider {
  provide?: unknown;
  useClass?: unknown;
  useValue?: unknown;
  useFactory?: unknown;
}

interface ThrottlerModuleOptions {
  name: string;
  ttl: number;
  limit: number;
}

describe('AppModule — providers de segurança global (P0-02)', () => {
  const providers = Reflect.getMetadata('providers', AppModule) as ModuleProvider[] | undefined;

  it('declara metadata `providers` no decorator @Module', () => {
    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers!.length).toBeGreaterThan(0);
  });

  it('registra ThrottlerGuard como APP_GUARD (P0-02)', () => {
    expect(providers).toBeDefined();

    // APP_GUARD é multi-provider — pode coexistir com JwtAuthGuard, RolesGuard
    // e outros guards globais. Procuramos especificamente pelo useClass.
    const guardProvider = providers!.find((p) => p.useClass === ThrottlerGuard);

    expect(guardProvider).toBeDefined();
    expect(guardProvider!.provide).toBe(APP_GUARD);
  });

  it('preserva os outros guards globais (JwtAuthGuard + RolesGuard)', () => {
    expect(providers).toBeDefined();
    const appGuardProviders = providers!.filter((p) => p.provide === APP_GUARD);
    expect(appGuardProviders.length).toBeGreaterThanOrEqual(3);

    const useClasses = appGuardProviders.map((p) => p.useClass?.name);
    expect(useClasses).toContain('JwtAuthGuard');
    expect(useClasses).toContain('RolesGuard');
    expect(useClasses).toContain('ThrottlerGuard');
  });
});

describe('AppModule — ThrottlerModule tiers (rate limiting tierizado)', () => {
  it('importa ThrottlerModule como DynamicModule no array imports', () => {
    // O decorator @Module() armazena `imports` na chave 'imports' via
    // Reflect.defineMetadata. Lemos para conferir os tiers declarados.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    expect(imports).toBeDefined();
    expect(Array.isArray(imports)).toBe(true);

    // Cada DynamicModule carrega `.module` (Classe) + `.providers` + `.exports`
    // após `.forRoot()`. Aqui validamos que há pelo menos um módulo
    // relacionado ao ThrottlerModule procurando por nome nas opções.
    const throttlerModuleRefs = imports!.filter((imp) => {
      return (
        imp && typeof imp === 'object' && 'module' in imp && imp.module?.name === 'ThrottlerModule'
      );
    });
    expect(throttlerModuleRefs.length).toBeGreaterThan(0);
  });
});

describe('AppModule — configuração de tiers (nomes + limites esperados)', () => {
  // IMPORTANTE (IMPORTANT #1 do code review P0-02): o teste anterior era
  // tautológico — declarava `expectedTiers` como constante local e
  // validava contra ele mesmo. Não havia garantia de que o `AppModule`
  // efetivamente continha aqueles tiers. Aqui lemos os tiers diretamente
  // do `imports` via `Reflect.getMetadata('imports', AppModule)`,
  // subimos um TestingModule mínimo com os mesmos `imports` do
  // ThrottlerModule do AppModule e lemos `getOptionsToken()` (injetado
  // pelo guard). Isso garante que validamos **o que ThrottlerGuard
  // EFETIVAMENTE recebe em runtime** — não apenas o que está declarado
  // em metadata. Se mudar `app.module.ts`, este teste falhará.

  it('extrai tiers diretamente do ThrottlerModule do AppModule (não tautológico)', async () => {
    const { Test } = await import('@nestjs/testing');
    const { getOptionsToken } = await import('@nestjs/throttler');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    expect(Array.isArray(imports)).toBe(true);

    // Filtra apenas os imports do ThrottlerModule vindos do AppModule
    // real. Se mudar `app.module.ts`, este teste falhará — não é
    // tautológico.
    const throttlerImports = imports!.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imp: any) => imp?.module?.name === 'ThrottlerModule'
    );
    expect(throttlerImports.length).toBeGreaterThan(0);

    const testingModule = await Test.createTestingModule({
      imports: throttlerImports,
    }).compile();

    // Lê as opções ThrottlerModule do provider registrado por forRoot().
    const options = testingModule.get(getOptionsToken()) as ThrottlerModuleOptions[];
    expect(Array.isArray(options)).toBe(true);

    // Após a restruturação (BLOCKER #1), esperamos apenas o tier `default`.
    const tierNames = options.map((o) => o.name).sort();
    expect(tierNames).toEqual(['default']);

    const defaultTier = options.find((o) => o.name === 'default')!;
    expect(defaultTier.ttl).toBe(60_000);
    expect(defaultTier.limit).toBe(300);

    await testingModule.close();
  });
});
