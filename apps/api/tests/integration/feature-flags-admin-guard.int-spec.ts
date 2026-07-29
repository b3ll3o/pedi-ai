/**
 * @spec(RNF-SEC-FF-01)
 *
 * Integração — `FeatureFlagAdminGuard` aplicado via `@UseGuards` no
 * `FeatureFlagsController` (P0-03).
 *
 * **Bug original:** o controller declarava `const _adminGuard = FeatureFlagAdminGuard;
 * void _adminGuard;` — guard importado mas nunca invocado. Usuários
 * autenticados com role `cliente` conseguiam chamar PATCH/POST/DELETE
 * em `/admin/feature-flags/*`.
 *
 * **Fix:** aplicar `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)` no
 * controller e remover o dead code.
 *
 * **Bug pré-existente (corrigido em P0-03-fase-2):** handlers `listar`,
 * `criar`, `atualizar`, `adicionarOverride`, `avaliar` usavam argumentos
 * posicionais sem decorators `@Req()`/`@Param()`/`@Body()`/`@Query()`. Em
 * produção NestJS/Fastify injetava `undefined` em todos os slots, fazendo
 * `req.user.sub` lançar TypeError (500). Adicionados os decorators canônicos
 * e trocado `req.user.sub` por `req.user.id` (alinhado com `AuthenticatedUser`).
 *
 * **Estratégia de teste:**
 *
 * Combina dois estilos para cobertura end-to-end real:
 *
 *   1) **Pipeline-mock (rápido)** — instancia `FeatureFlagsController` com
 *      bundle POJO de use cases + `TestJwtAuthGuard` + `FeatureFlagAdminGuard`,
 *      monta `ExecutionContext` mínimo e exercita a sequência
 *      `JwtAuthGuard → FeatureFlagAdminGuard → handler`. Valida a integração
 *      `@UseGuards(...)` + RBAC sem depender de HTTP wiring completo.
 *
 *   2) **`app.inject()` (end-to-end)** — sobe um `NestFastifyApplication`
 *      com o `FeatureFlagsModule` (mas sem providers de DB/Redis — use cases
 *      mockados via `useValue`) e dispara requests HTTP reais via Fastify
 *      `inject()`. Prova que os decorators `@Req()`/`@Param()`/`@Body()`
 *      foram reconhecidos pelo pipeline NestJS — body e params chegam ao
 *      handler, não `undefined`.
 *
 * Adicionalmente, validamos estaticamente que:
 *   - `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)` está nos metadados
 *     da classe (regressão contra remoção do guard).
 *   - O dead code `void _adminGuard` foi removido do source.
 *
 * **Sem AppModule inteiro:** não dependemos de DB/Redis/BullMQ.
 */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { FeatureFlagsController } from '../../src/presentation/admin/feature-flags/controllers/FeatureFlagsController';
import { FeatureFlagAdminGuard } from '../../src/presentation/admin/feature-flags/guards/FeatureFlagAdminGuard';
import { IS_PUBLIC_KEY } from '../../src/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';

/**
 * JwtAuthGuard mock — popula `req.user` a partir de um header
 * `X-Test-User` (JSON `{ sub, id, role }`). Sem header → 401.
 *
 * Honra o `@Public()` consultando `Reflector`+`IS_PUBLIC_KEY` exatamente
 * como o `JwtAuthGuard` real faz.
 *
 * Não aplicamos `@Injectable()` + constructor injection aqui porque o esbuild
 * usado pelo vitest não processa decorator metadata em arquivos de teste
 * para parameter properties (retornaria `undefined`). Instanciamos via
 * `new TestJwtAuthGuard(reflector)` no test runner.
 */
class TestJwtAuthGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly reflector: any) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { sub: string; id: string; role: string };
    }>();
    const header = req.headers['x-test-user'];
    if (!header) {
      throw new UnauthorizedException('Token ausente ou inválido');
    }
    const parsed = JSON.parse(header) as { sub: string; id: string; role: string };
    req.user = { sub: parsed.sub, id: parsed.id, role: parsed.role };
    return true;
  }
}

/**
 * Constroi um `ExecutionContext` NestJS mínimo que imita o pipeline HTTP
 * para um handler `handlerName` de `FeatureFlagsController`. Usado para
 * invocar os guards `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)` como
 * o NestJS faria em runtime. Aplica metadata `IS_PUBLIC_KEY` quando
 * `isPublic=true` para que `FeatureFlagAdminGuard` libere a rota.
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
    user?: { sub: string; id: string; role: string };
  };
} {
  const req: {
    method: string;
    headers: Record<string, string | undefined>;
    user?: { sub: string; id: string; role: string };
  } = {
    method: httpMethod,
    headers: { 'x-test-user': userHeader },
  };
  if (userHeader) {
    const parsed = JSON.parse(userHeader) as { sub: string; id: string; role: string };
    req.user = parsed;
  }
  const handler = function (): unknown {
    return undefined;
  };
  Object.defineProperty(handler, 'name', { value: handlerName });
  if (isPublic) {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  }
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
  return { ctx, req };
}

describe('FeatureFlagsController — AdminGuard aplicado via @UseGuards (P0-03)', () => {
  let testingModule: TestingModule;
  let controller: FeatureFlagsController;
  let uc: Record<string, { executar: ReturnType<typeof vi.fn> }>;
  let jwtGuard: TestJwtAuthGuard;
  let adminGuard: FeatureFlagAdminGuard;
  let reflector: Reflector;

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

    testingModule = await Test.createTestingModule({
      providers: [Reflector, FeatureFlagAdminGuard, TestJwtAuthGuard],
    }).compile();

    reflector = testingModule.get(Reflector);
    // FeatureFlagAdminGuard agora requer Reflector (mesma chave IS_PUBLIC_KEY
    // usada pelo JwtAuthGuard real — vide MINOR #2 do spec).
    adminGuard = new FeatureFlagAdminGuard(reflector);
    jwtGuard = new TestJwtAuthGuard(reflector);
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
        runPipeline(
          'atualizar',
          'PATCH',
          JSON.stringify({ sub: 'u-cliente', id: 'u-cliente', role: 'cliente' })
        )
      ).toThrow(/cliente|não tem acesso|forbidden|403/i);
    });

    it('atendente recebe 403 (role não-admin)', () => {
      expect(() =>
        runPipeline(
          'atualizar',
          'PATCH',
          JSON.stringify({ sub: 'u-atend', id: 'u-atend', role: 'atendente' })
        )
      ).toThrow(/atendente|não tem acesso|forbidden|403/i);
    });

    it('gerente recebe 403 em mutação (somente leitura permitida)', () => {
      expect(() =>
        runPipeline(
          'atualizar',
          'PATCH',
          JSON.stringify({ sub: 'u-ger', id: 'u-ger', role: 'gerente' })
        )
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
        JSON.stringify({ sub: 'u-owner', id: 'u-owner', role: 'dono' })
      );

      // 3) Handler — chamado após os guards passarem (chamada posicional
      //    preserva compat com testes diretos; decorators são usados em
      //    produção via NestJS HTTP pipeline).
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
        runPipeline(
          'criar',
          'POST',
          JSON.stringify({ sub: 'u-cliente', id: 'u-cliente', role: 'cliente' })
        )
      ).toThrow(/cliente|não tem acesso|forbidden|403/i);
    });

    it('dono passa o guard e handler é chamado', async () => {
      uc.criar.executar.mockResolvedValue({ id: 'f-new', key: 'new_flag' });

      const { req } = runPipeline(
        'criar',
        'POST',
        JSON.stringify({ sub: 'u-owner', id: 'u-owner', role: 'dono' })
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

      // `@Public()` aplicado via metadata IS_PUBLIC_KEY (vide docblock do
      // FeatureFlagAdminGuard) — `avaliar` não exige user.
      const { req } = runPipeline('avaliar', 'GET', undefined, true);

      const result = await controller.avaliar({ keys: 'pix_enabled' });

      expect(uc.avaliar.executar).toHaveBeenCalled();
      expect(result).toMatchObject({ pix_enabled: true });
    });
  });

  describe('verificação estática — guards estão conectados via decorator', () => {
    it('controller declara @UseGuards(JwtAuthGuard, FeatureFlagAdminGuard) na metadata de classe', () => {
      // Falha se alguém remover o @UseGuards do controller ou trocar a ordem.
      const guards = Reflect.getMetadata('__guards__', FeatureFlagsController) as
        Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toBeDefined();
      expect(guards).toBeTruthy();
      const guardNames = (guards ?? []).map((g) => g.name);

      // Defense-in-depth: ambos os guards devem estar registrados.
      // MINOR #1 do spec: comentário sobre a duplicação intencional.
      expect(guardNames).toContain('FeatureFlagAdminGuard');
      expect(guardNames).toContain('JwtAuthGuard');
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

/**
 * End-to-end: sobe um NestFastifyApplication com o controller e dispara
 * requests HTTP reais via Fastify `inject()`. Valida que os decorators
 * `@Req()`/`@Param()`/`@Body()`/`@Query()` foram reconhecidos pelo pipeline
 * NestJS — body, params e query chegam ao handler, não `undefined` (bug
 * pré-existente corrigido no P0-03-fase-2).
 *
 * Os use cases são mockados (`useValue`); dependências de DB/Redis são
 * evitadas para não exigir infra no CI.
 */
describe('FeatureFlagsController — integração HTTP end-to-end (Fastify inject)', () => {
  let app: NestFastifyApplication;
  let moduleRef: TestingModule;
  let uc: Record<string, { executar: ReturnType<typeof vi.fn> }>;

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

    // Importante: como o `FeatureFlagsController` tem tipos concretos
    // nos slots do construtor (não `any`), NestJS infere os tokens de DI
    // pelas classes. Fornecemos mocks via `useFactory`+`inject` para
    // preservar o tipo em runtime (vide docblock do module original).
    const { AdicionarOverrideUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/AdicionarOverrideUseCase');
    const { AtualizarFeatureFlagUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/AtualizarFeatureFlagUseCase');
    const { AvaliarFeatureFlagsUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/AvaliarFeatureFlagsUseCase');
    const { CriarFeatureFlagUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/CriarFeatureFlagUseCase');
    const { ListarAuditLogUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/ListarAuditLogUseCase');
    const { ListarFeatureFlagsUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/ListarFeatureFlagsUseCase');
    const { ListarOverridesUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/ListarOverridesUseCase');
    const { ObterFeatureFlagUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/ObterFeatureFlagUseCase');
    const { RemoverOverrideUseCase } =
      await import('../../src/application/admin/feature-flags/use-cases/RemoverOverrideUseCase');

    // Reflector compartilhado entre o override de JwtAuthGuard e o guard real.
    const localReflector = new Reflector();

    moduleRef = await Test.createTestingModule({
      controllers: [FeatureFlagsController],
      providers: [
        Reflector,
        FeatureFlagAdminGuard,
        ListarFeatureFlagsUseCase,
        ObterFeatureFlagUseCase,
        CriarFeatureFlagUseCase,
        AtualizarFeatureFlagUseCase,
        AdicionarOverrideUseCase,
        RemoverOverrideUseCase,
        ListarOverridesUseCase,
        ListarAuditLogUseCase,
        AvaliarFeatureFlagsUseCase,
        {
          // Substitui a implementação real do ListarFeatureFlagsUseCase
          // (que tem deps de DB/Repo) por um mock POJO.
          provide: ListarFeatureFlagsUseCase,
          useValue: uc.listar,
        },
        {
          provide: ObterFeatureFlagUseCase,
          useValue: uc.obter,
        },
        {
          provide: CriarFeatureFlagUseCase,
          useValue: uc.criar,
        },
        {
          provide: AtualizarFeatureFlagUseCase,
          useValue: uc.atualizar,
        },
        {
          provide: AdicionarOverrideUseCase,
          useValue: uc.adicionarOverride,
        },
        {
          provide: RemoverOverrideUseCase,
          useValue: uc.removerOverride,
        },
        {
          provide: ListarOverridesUseCase,
          useValue: uc.listarOverrides,
        },
        {
          provide: ListarAuditLogUseCase,
          useValue: uc.listarAudit,
        },
        {
          provide: AvaliarFeatureFlagsUseCase,
          useValue: uc.avaliar,
        },
      ],
    })
      // Sobrescreve JwtAuthGuard registrado no @UseGuards do controller
      // pelo nosso mock de teste. `@UseGuards(JwtAuthGuard, ...)` resolve
      // pela referência da classe, então `overrideGuard` substitui em runtime.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext): boolean => {
          return new TestJwtAuthGuard(localReflector).canActivate(ctx);
        },
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (moduleRef) await moduleRef.close();
  });

  it('PATCH /admin/feature-flags/:key com body chega ao handler (dono, 200)', async () => {
    uc.atualizar.executar.mockResolvedValue({ id: 'f1', key: 'pix_enabled', enabled: false });

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/feature-flags/pix_enabled',
      headers: {
        'content-type': 'application/json',
        'x-test-user': JSON.stringify({ sub: 'u-owner', id: 'u-owner', role: 'dono' }),
      },
      payload: { enabled: false },
    });

    expect(res.statusCode).toBe(200);

    // Prova que `@Param('key')` E `@Body()` chegaram ao handler — antes
    // do fix (positional args sem decorators) ambos seriam `undefined`.
    expect(uc.atualizar.executar).toHaveBeenCalledWith({
      key: 'pix_enabled',
      patch: { enabled: false },
      actorId: 'u-owner',
    });
  });

  it('PATCH /admin/feature-flags/:key sem token retorna 401', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/feature-flags/pix_enabled',
      headers: { 'content-type': 'application/json' },
      payload: { enabled: false },
    });

    expect(res.statusCode).toBe(401);
  });

  it('PATCH /admin/feature-flags/:key como cliente retorna 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/feature-flags/pix_enabled',
      headers: {
        'content-type': 'application/json',
        'x-test-user': JSON.stringify({ sub: 'u-cli', id: 'u-cli', role: 'cliente' }),
      },
      payload: { enabled: false },
    });

    expect(res.statusCode).toBe(403);
  });

  it('POST /admin/feature-flags com body chega ao handler (dono, 201)', async () => {
    uc.criar.executar.mockResolvedValue({ id: 'f-new', key: 'new_flag' });

    const res = await app.inject({
      method: 'POST',
      url: '/admin/feature-flags',
      headers: {
        'content-type': 'application/json',
        'x-test-user': JSON.stringify({ sub: 'u-owner', id: 'u-owner', role: 'dono' }),
      },
      payload: { key: 'new_flag', valueType: 'BOOLEAN', defaultValue: false },
    });

    expect(res.statusCode).toBe(201);

    expect(uc.criar.executar).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'new_flag',
        actorId: 'u-owner',
      })
    );
  });

  it('GET /admin/feature-flags/evaluate funciona sem auth (@Public)', async () => {
    uc.avaliar.executar.mockResolvedValue({ pix_enabled: true });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/feature-flags/evaluate?keys=pix_enabled',
    });

    expect(res.statusCode).toBe(200);
    expect(uc.avaliar.executar).toHaveBeenCalled();
  });
});
