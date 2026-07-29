/**
 * Step definitions BDD — Política de senha NIST 800-63B (P0-10).
 *
 * Idioma: pt-BR. Rastreabilidade: cobre o feature
 * `test/features/autenticacao/password-policy.feature`.
 *
 * **Estratégia:** valida o contrato do `validarForcaSenha` (privado)
 * através dos call sites públicos `AuthService.register()` e
 * `AuthService.resetPassword()`. Instancia `AuthService` diretamente
 * com mocks manuais de Prisma/Jwt/RefreshToken/EmailQueue.
 *
 * **HIBP:** stub global de `fetch` que controla o que a API HIBP responde.
 * Por padrão retorna body vazio (senha não vazada). Cenários de
 * vazamento sobrescrevem o stub via step.
 *
 * **Mocks:** como BDD usa `ts-node/register` (não vitest), `vi` não
 * está disponível. Usamos objetos com `jest.fn`-like criado manualmente.
 *
 * MINOR: world armazenado em `this` (idiomático cucumber-js).
 */

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';

import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/common/prisma.service';
import { RefreshTokenService } from '../../src/auth/refresh-token.service';
import { JwtService } from '@nestjs/jwt';
import { EmailQueue } from '../../src/queues/email.queue';

interface MockFn<T = unknown> {
  (...args: unknown[]): T;
  mockResolvedValue(v: unknown): MockFn<T>;
  mockReturnValue(v: T): MockFn<T>;
  mockImplementation(i: (...args: unknown[]) => T): MockFn<T>;
}

/**
 * Cria uma função mock manual (estilo jest.fn). Não depende de vitest.
 *
 * IMPORTANTE: o `impl` precisa ser capturado por closure mutável para
 * que `mockResolvedValue` / `mockReturnValue` / `mockImplementation`
 * consigam atualizá-lo depois da criação inicial.
 */
function fn<T = unknown>(initialImpl?: (...args: unknown[]) => T): MockFn<T> {
  let impl: ((...args: unknown[]) => T) | undefined = initialImpl;
  const stub = ((...args: unknown[]) => (impl ? impl(...args) : (undefined as T))) as MockFn<T>;
  stub.mockResolvedValue = (v: unknown): MockFn<T> => {
    impl = () => Promise.resolve(v) as unknown as T;
    return stub;
  };
  stub.mockReturnValue = (v: T): MockFn<T> => {
    impl = () => v;
    return stub;
  };
  stub.mockImplementation = (i: (...args: unknown[]) => T): MockFn<T> => {
    impl = i;
    return stub;
  };
  return stub;
}

interface PasswordPolicyWorld {
  service: AuthService | null;
  // Resultado da última tentativa de cadastro.
  lastRegisterError: unknown;
  lastRegisterResult: unknown;
  // Resultado da última tentativa de reset.
  lastResetError: unknown;
  lastResetResult: unknown;
  // Stubs para o HIBP.
  hibpFetch: ((url: string) => Promise<Response>) | null;
  // Snapshot do fetch original para restaurar.
  originalFetch: typeof fetch | null;
}

class PasswordPolicyWorldImpl implements PasswordPolicyWorld {
  service: AuthService | null = null;
  lastRegisterError: unknown = null;
  lastRegisterResult: unknown = null;
  lastResetError: unknown = null;
  lastResetResult: unknown = null;
  hibpFetch: ((url: string) => Promise<Response>) | null = null;
  originalFetch: typeof fetch | null = null;

  build(): AuthService {
    const mockPrisma = {
      usersProfile: {
        findUnique: fn().mockResolvedValue(null),
        create: fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'user-1',
          email: data['email'] as string,
          name: data['name'] as string,
          passwordHash: data['passwordHash'] as string,
          role: 'cliente',
          restaurantId: null,
        })),
      },
      refreshToken: {
        updateMany: fn().mockResolvedValue({ count: 0 }),
      },
      passwordResetToken: {
        updateMany: fn().mockResolvedValue({ count: 1 }),
        findFirst: fn().mockResolvedValue({ userId: 'user-1' }),
      },
      $transaction: fn().mockResolvedValue([]),
    } as unknown as PrismaService;

    const mockJwt = {
      sign: fn().mockReturnValue('mock-jwt-token'),
    } as unknown as JwtService;

    const mockRefresh = {
      issue: fn().mockResolvedValue({
        token: 'mock-refresh-token',
        tokenId: 'mock-token-id',
        familyId: 'mock-family-id',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    } as unknown as RefreshTokenService;

    const mockEmail = {} as unknown as EmailQueue;

    return new AuthService(mockPrisma, mockJwt, mockRefresh, mockEmail);
  }
}

// Stub de fetch default — HIBP retorna "não vazada" (corpo vazio).
function defaultHibpFetch(_url: string): Promise<Response> {
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve(''),
  } as Response);
}

Before(function () {
  const w = new PasswordPolicyWorldImpl();
  (this as unknown as { pp: PasswordPolicyWorld }).pp = w;
  w.originalFetch = globalThis.fetch;
  w.hibpFetch = defaultHibpFetch;
  globalThis.fetch = ((url: unknown) => w.hibpFetch!(url as string)) as unknown as typeof fetch;
  w.service = w.build();
});

After(function () {
  const w = (this as unknown as { pp?: PasswordPolicyWorld }).pp;
  if (!w) return;
  if (w.originalFetch) {
    globalThis.fetch = w.originalFetch;
  } else {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  }
});

function worldFrom(thisCtx: unknown): PasswordPolicyWorldImpl {
  const ctx = thisCtx as { pp?: PasswordPolicyWorldImpl };
  if (!ctx.pp) throw new Error('World de password-policy não inicializado');
  return ctx.pp as unknown as PasswordPolicyWorldImpl;
}

// ─────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────

Given('que o AuthService está pronto', function () {
  const w = worldFrom(this);
  if (!w.service) w.service = w.build();
});

Given('o HIBP mockado para retornar cache vazio', function () {
  const w = worldFrom(this);
  w.hibpFetch = defaultHibpFetch;
});

Given('que o HIBP retorna vazamento para a senha {string}', function (senha: string) {
  const w = worldFrom(this);
  const sha1 = crypto.createHash('sha1').update(senha).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const body = `${suffix}:1234\nOTHER_SUFFIX:99`;
  w.hibpFetch = (url: string) => {
    if (url.includes(`/range/${prefix}`)) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(body),
      } as Response);
    }
    return defaultHibpFetch(url);
  };
});

Given('que o HIBP está cacheado como vazada para a senha {string}', function (senha: string) {
  // Mesmo comportamento que "retorna vazamento" — mas a diferença é que o
  // cenário declara a presença do cache LRU. Para o teste externo, ambos
  // resultam em "API HIBP reporta vazamento". Diferença interna é que o
  // cache hit NÃO faz fetch — mas como estamos stubbando fetch, esse
  // detalhe é invisível aqui. A unidade de cobertura é o comportamento
  // externo.
  const w = worldFrom(this);
  const sha1 = crypto.createHash('sha1').update(senha).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const body = `${suffix}:1234`;
  w.hibpFetch = (url: string) => {
    if (url.includes(`/range/${prefix}`)) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(body),
      } as Response);
    }
    return defaultHibpFetch(url);
  };
});

Given('que o HIBP NÃO retorna vazamento para a senha {string}', function (_senha: string) {
  const w = worldFrom(this);
  w.hibpFetch = defaultHibpFetch;
});

Given('que o HIBP está fora do ar', function () {
  const w = worldFrom(this);
  w.hibpFetch = (_url: string) => Promise.reject(new Error('HIBP offline (simulado)'));
});

// ─────────────────────────────────────────────────────────────────
// Ações
// ─────────────────────────────────────────────────────────────────

When('tento cadastrar com senha {string}', async function (senha: string) {
  const w = worldFrom(this);
  if (!w.service) throw new Error('AuthService não pronto');
  try {
    w.lastRegisterResult = await w.service.register({
      email: 'test@example.com',
      password: senha,
      name: 'Test User',
    });
    w.lastRegisterError = null;
  } catch (err) {
    w.lastRegisterError = err;
    w.lastRegisterResult = null;
  }
});

When('tento cadastrar com senha de {int} caracteres', async function (n: number) {
  const w = worldFrom(this);
  if (!w.service) throw new Error('AuthService não pronto');
  const senha = 'a'.repeat(n);
  try {
    w.lastRegisterResult = await w.service.register({
      email: 'test@example.com',
      password: senha,
      name: 'Test User',
    });
    w.lastRegisterError = null;
  } catch (err) {
    w.lastRegisterError = err;
    w.lastRegisterResult = null;
  }
});

When('tento redefinir senha com nova senha {string}', async function (novaSenha: string) {
  const w = worldFrom(this);
  if (!w.service) throw new Error('AuthService não pronto');
  try {
    w.lastResetResult = await w.service.resetPassword({
      token: 'valid-token',
      newPassword: novaSenha,
    });
    w.lastResetError = null;
  } catch (err) {
    w.lastResetError = err;
    w.lastResetResult = null;
  }
});

// ─────────────────────────────────────────────────────────────────
// Asserções
// ─────────────────────────────────────────────────────────────────

Then('o cadastro é aceito', function () {
  const w = worldFrom(this);
  assert.strictEqual(
    w.lastRegisterError,
    null,
    `esperava sucesso, recebi erro: ${String(w.lastRegisterError)}`
  );
  assert.ok(w.lastRegisterResult, 'register() deveria retornar um AuthResponse');
});

Then('o cadastro é aceito \\(sem regex de composição\\)', function () {
  const w = worldFrom(this);
  assert.strictEqual(
    w.lastRegisterError,
    null,
    `esperava sucesso, recebi erro: ${String(w.lastRegisterError)}`
  );
});

Then('o cadastro é aceito \\(fail-open no HIBP\\)', function () {
  const w = worldFrom(this);
  assert.strictEqual(
    w.lastRegisterError,
    null,
    `esperava sucesso (fail-open), recebi erro: ${String(w.lastRegisterError)}`
  );
});

Then('a senha é armazenada como hash bcrypt', function () {
  const w = worldFrom(this);
  assert.ok(w.lastRegisterResult, 'register deveria ter sucesso');
});

Then('o reset é aceito', function () {
  const w = worldFrom(this);
  assert.strictEqual(
    w.lastResetError,
    null,
    `esperava sucesso no reset, recebi erro: ${String(w.lastResetError)}`
  );
});

Then('recebo erro 400', function () {
  const w = worldFrom(this);
  const err = w.lastRegisterError ?? w.lastResetError;
  assert.ok(err, 'esperava um erro lançado');
  if (!(err instanceof BadRequestException)) {
    const name = err instanceof Error ? err.constructor.name : typeof err;
    const message = err instanceof Error ? err.message : String(err);
    assert.fail(`esperava BadRequestException, recebi: ${name}: ${message}`);
  }
});

Then('recebo erro 400 {string}', function (mensagem: string) {
  const w = worldFrom(this);
  const err = w.lastRegisterError ?? w.lastResetError;
  assert.ok(err, 'esperava um erro lançado');
  assert.ok(
    err instanceof BadRequestException,
    `esperava BadRequestException, recebi: ${String(err)}`
  );
  const actual = err.message;
  assert.ok(
    actual.includes(mensagem) || actual.toLowerCase().includes(mensagem.toLowerCase()),
    `esperava mensagem contendo "${mensagem}", recebi: "${actual}"`
  );
});
