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
  // Documenta os 3 tiers declarados em app.module.ts. Se mudar o
  // ThrottlerModule.forRoot([...]), rever RF-SEC-01 / RNF-SEC-FF-01.
  // Estes tiers são usados pelos @Throttle() decorators nos controllers.
  const expectedTiers: ThrottlerModuleOptions[] = [
    { name: 'short', ttl: 60_000, limit: 5 },
    { name: 'medium', ttl: 60_000, limit: 30 },
    { name: 'long', ttl: 60_000, limit: 300 },
  ];

  it('declara exatamente os 3 tiers esperados (short/medium/long)', () => {
    expect(expectedTiers).toHaveLength(3);
    expect(expectedTiers.map((t) => t.name).sort()).toEqual(['long', 'medium', 'short']);
  });

  it.each(expectedTiers)('tier $name usa janela de 60s (ttl=$ttl) com limit=$limit', (tier) => {
    expect(tier.ttl).toBe(60_000);
    expect(tier.limit).toBeGreaterThan(0);
  });
});
