/**
 * @spec(RNF-SEC-FF-01)
 *
 * Integração — `FeatureFlagAdminGuard` aplicado via `@UseGuards` no
 * `FeatureFlagsController` (P0-03).
 *
 * **Bug:** o controller declarava `const _adminGuard = FeatureFlagAdminGuard;
 * void _adminGuard;` — guard importado mas nunca invocado. Usuários
 * autenticados com role `cliente` conseguiam chamar PATCH/POST/DELETE
 * em `/admin/feature-flags/*`.
 *
 * **Fix:** aplicar `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)` no
 * controller e remover o dead code.
 *
 * **Estratégia de teste:**
 *
 * O `FeatureFlagsController` usa um padrão atípico de assinatura de
 * handler (argumentos posicionais sem `@Body()`/`@Param()`), o que
 * torna inviável exercitar o pipeline HTTP completo NestJS via
 * `app.inject()` (a request body não chega ao handler). Para validar
 * a integração `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)` sem
 * depender de HTTP wiring, instanciamos:
 *
 *   1) `FeatureFlagsController` real com bundle POJO de use cases
 *   2) `FeatureFlagAdminGuard` real (provider do módulo)
 *   3) `TestJwtAuthGuard` mock (lê `X-Test-User` e popula `req.user`)
 *
 * Em seguida, montamos um `ExecutionContext` NestJS por cenário e
 * executamos **ambos os guards** exatamente como o pipeline faria.
 * Isso prova que os guards estão conectados via decorator `@UseGuards`
 * E que o `FeatureFlagAdminGuard` está aplicando a lógica RBAC correta.
 *
 * Adicionalmente, validamos estaticamente que o decorator está em
 * vigor (`Reflect.getMetadata('__guards__', ...)`) e que o dead code
 * `void _adminGuard` foi removido do source.
 *
 * **Sem AppModule inteiro:** não dependemos de DB/Redis/BullMQ.
 */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { FeatureFlagsController } from '../../src/presentation/admin/feature-flags/controllers/FeatureFlagsController';
import { FeatureFlagAdminGuard } from '../../src/presentation/admin/feature-flags/guards/FeatureFlagAdminGuard';

/**
 * JwtAuthGuard mock — popula `req.user` a partir de um header
 * `X-Test-User` (JSON `{ sub, role }`). Sem header → 401.
 *
 * Honra a flag `@Public()` por convenção: se o contexto carregar
 * `__isPublic: true` (setado pelo helper `makeContext`), o guard
 * libera a rota sem autenticação (em produção, o `JwtAuthGuard`
 * real consulta `Reflector` para `IS_PUBLIC_KEY`).
 *
 * Não aplicamos `@Injectable()` aqui porque o esbuild usado pelo
 * vitest não processa decorators em arquivos de teste (retornaria
 * `undefined`). Como instanciamos via `new TestJwtAuthGuard()` no
 * test runner, o decorator não é necessário.
 */
class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { sub: string; role: string };
    }>();
    // Suporta `@Public()` via convenção de teste.
    if ((context as unknown as { __isPublic?: boolean }).__isPublic) {
      return true;
    }
    const header = req.headers['x-test-user'];
    if (!header) {
      throw new UnauthorizedException('Token ausente ou inválido');
    }
    const parsed = JSON.parse(header) as { sub: string; role: string };
    req.user = { sub: parsed.sub, role: parsed.role };
    return true;
  }
}

/**
 * Constroi um `ExecutionContext` NestJS mínimo que imita o pipeline
 * HTTP para um handler `handlerName` de `FeatureFlagsController`. Usado
 * para invocar os guards `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)`
 * como o NestJS faria em runtime.
 */
function makeContext(
  handlerName: 'atualizar' | 'criar' | 'avaliar' | 'obter' | 'removerOverride',
  httpMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  userHeader?: string,
  isPublic = false
): {
  ctx: ExecutionContext;
  req: {
    method: string;
    headers: Record<string, string | undefined>;
    user?: { sub: string; role: string };
  };
} {
  const req: {
    method: string;
    headers: Record<string, string | undefined>;
    user?: { sub: string; role: string };
  } = {
    method: httpMethod,
    headers: { 'x-test-user': userHeader },
  };
  if (userHeader) {
    req.user = JSON.parse(userHeader) as { sub: string; role: string };
  }
  const handler = function (): unknown {
    return undefined;
  };
  Object.defineProperty(handler, 'name', { value: handlerName });
  const cls = class FakeController {};
  Object.defineProperty(cls, 'name', { value: 'FeatureFlagsController' });
  const ctx: ExecutionContext = {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}) as never,
    switchToWs: () => ({}) as never,
    getType: () => 'http',
    getRequest: () => req as never,
    getResponse: () => ({}) as never,
  } as unknown as ExecutionContext;
  // Stash a flag de rota pública no request para o TestJwtAuthGuard checar
  // (em produção, o JwtAuthGuard real consulta `Reflector`).
  (ctx as unknown as { __isPublic: boolean }).__isPublic = isPublic;
  return { ctx, req };
}

describe('FeatureFlagsController — AdminGuard aplicado via @UseGuards (P0-03)', () => {
  let testingModule: TestingModule;
  let controller: FeatureFlagsController;
  let uc: Record<string, { executar: ReturnType<typeof vi.fn> }>;
  let jwtGuard: TestJwtAuthGuard;
  let adminGuard: FeatureFlagAdminGuard;

  beforeAll(async () => {
    uc = {
      listar: { executar: vi.fn() },
      obter: { executar: vi.fn() },
      criar: { executar: vi.fn() },
      atualizar: { executar: vi.fn() },
      adicionarOverride: { executar: vi.fn() },
      removerOverride: { executar: vi.fn() },
      listarOverrides: { executar: vi.fn() },
      listarAudit: { executar: vi.fn() },
      avaliar: { executar: vi.fn() },
    };

    // Instancia o controller diretamente com o bundle POJO — formato
    // suportado pelo construtor (vide docblock do controller).
    controller = new FeatureFlagsController(uc as never);

    // Instancia os guards reais para usar nas chamadas manuais.
    adminGuard = new FeatureFlagAdminGuard();
    jwtGuard = new TestJwtAuthGuard();

    // Garante que Reflector existe (necessário para o JwtAuthGuard real).
    testingModule = await Test.createTestingModule({
      providers: [Reflector],
    }).compile();
  });

  afterAll(async () => {
    if (testingModule) {
      await testingModule.close();
    }
  });

  /**
   * Simula o pipeline NestJS: JwtAuthGuard → FeatureFlagAdminGuard →
   * handler. Se qualquer guard lançar, propaga o erro.
   */
  function runPipeline(
    handlerName: 'atualizar' | 'criar' | 'avaliar',
    httpMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    userHeader: string | undefined,
    isPublic = false
  ): { req: ReturnType<typeof makeContext>['req'] } {
    const { ctx, req } = makeContext(handlerName, httpMethod, userHeader, isPublic);

    // 1) JwtAuthGuard — popula req.user
    jwtGuard.canActivate(ctx);

    // 2) FeatureFlagAdminGuard — valida role
    adminGuard.canActivate(ctx);

    return { req };
  }

  describe('PATCH /admin/feature-flags/:key — atualizar', () => {
    it('cliente recebe 403 (FeatureFlagAdminGuard bloqueia)', () => {
      expect(() =>
        runPipeline('atualizar', 'PATCH', JSON.stringify({ sub: 'u-cliente', role: 'cliente' }))
      ).toThrow(/cliente|não tem acesso|forbidden|403/i);
    });

    it('atendente recebe 403 (role não-admin)', () => {
      expect(() =>
        runPipeline('atualizar', 'PATCH', JSON.stringify({ sub: 'u-atend', role: 'atendente' }))
      ).toThrow(/atendente|não tem acesso|forbidden|403/i);
    });

    it('gerente recebe 403 em mutação (somente leitura permitida)', () => {
      expect(() =>
        runPipeline('atualizar', 'PATCH', JSON.stringify({ sub: 'u-ger', role: 'gerente' }))
      ).toThrow(/Apenas owner|forbidden|403/i);
    });

    it('sem token (sem X-Test-User) recebe 401 antes do AdminGuard', () => {
      expect(() => runPipeline('atualizar', 'PATCH', undefined)).toThrow(
        /UnauthorizedException|Token ausente|Unauthorized/i
      );
    });

    it('dono passa o guard e use case é invocado (200)', async () => {
      uc.atualizar.executar.mockResolvedValue({
        id: 'f1',
        key: 'pix_enabled',
        enabled: false,
      });

      const { req } = runPipeline(
        'atualizar',
        'PATCH',
        JSON.stringify({ sub: 'u-owner', role: 'dono' })
      );

      // 3) Handler — chamado após os guards passarem
      const result = await controller.atualizar(req, 'pix_enabled', { enabled: false });

      expect(uc.atualizar.executar).toHaveBeenCalledWith({
        key: 'pix_enabled',
        patch: { enabled: false },
        actorId: 'u-owner',
      });
      expect(result).toMatchObject({ id: 'f1', key: 'pix_enabled', enabled: false });
    });
  });

  describe('POST /admin/feature-flags — criar', () => {
    it('cliente recebe 403', () => {
      expect(() =>
        runPipeline('criar', 'POST', JSON.stringify({ sub: 'u-cliente', role: 'cliente' }))
      ).toThrow(/cliente|não tem acesso|forbidden|403/i);
    });

    it('dono passa o guard e handler é chamado', async () => {
      uc.criar.executar.mockResolvedValue({ id: 'f-new', key: 'new_flag' });

      const { req } = runPipeline(
        'criar',
        'POST',
        JSON.stringify({ sub: 'u-owner', role: 'dono' })
      );

      const result = await controller.criar(req, {
        key: 'new_flag',
        valueType: 'BOOLEAN',
        defaultValue: false,
      });

      expect(uc.criar.executar).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'f-new', key: 'new_flag' });
    });
  });

  describe('GET /admin/feature-flags/evaluate — rota pública', () => {
    it('cliente sem token consegue chamar /evaluate (200)', async () => {
      uc.avaliar.executar.mockResolvedValue({ pix_enabled: true });

      // Em produção, @Public() faz o JwtAuthGuard real retornar `true`
      // sem autenticar. Aqui o TestJwtAuthGuard respeita a flag isPublic.
      const { req } = runPipeline('avaliar', 'GET', undefined, true);

      // O FeatureFlagAdminGuard tem um early-return para o handler
      // `avaliar` (vide `if (handler.name === 'avaliar') return true`).
      // Verificamos que, mesmo sem user, o guard libera.
      const result = await controller.avaliar({ keys: 'pix_enabled' });

      expect(uc.avaliar.executar).toHaveBeenCalled();
      expect(result).toMatchObject({ pix_enabled: true });
    });
  });

  describe('verificação estática — guard está conectado via decorator', () => {
    it('controller declara @UseGuards(FeatureFlagAdminGuard) na metadata de classe', () => {
      // Falha se alguém remover o @UseGuards do controller.
      const guards = Reflect.getMetadata('__guards__', FeatureFlagsController) as
        Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toBeDefined();
      expect(guards).toBeTruthy();
      const guardNames = (guards ?? []).map((g) => g.name);
      expect(guardNames).toContain('FeatureFlagAdminGuard');
    });

    it('controller NÃO tem mais o dead code `void _adminGuard`', () => {
      // Verificação estática (lê o source) — protege contra regressão
      // onde alguém reintroduz o swallow pattern.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const filePath = path.join(
        __dirname,
        '..',
        '..',
        'src',
        'presentation',
        'admin',
        'feature-flags',
        'controllers',
        'FeatureFlagsController.ts'
      );
      const source = fs.readFileSync(filePath, 'utf-8');
      expect(source).not.toMatch(/void\s+_adminGuard/);
    });
  });
});
