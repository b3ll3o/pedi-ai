/**
 * @spec(RNF-SEC-FF-01)
 *
 * Testes do guard `FeatureFlagAdminGuard` (NestJS CanActivate).
 * Regras:
 *  - owner: todos os métodos permitidos
 *  - manager: apenas leitura (GET)
 *  - staff: nenhum método admin
 *  - @Public() no handler/controller: bypass do guard (mesma convenção
 *    do JwtAuthGuard — vide MINOR #2 do spec do controller)
 *  - Fail-closed: sem role no token ⇒ 403
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';

import { FeatureFlagAdminGuard } from '../../../../../../src/presentation/admin/feature-flags/guards/FeatureFlagAdminGuard';
import { IS_PUBLIC_KEY } from '../../../../../../src/auth/decorators/public.decorator';

interface MockContext {
  switchToHttp: () => {
    getRequest: () => { method: string; user?: { role: string; sub: string } };
    getResponse: () => unknown;
  };
  getHandler: () => { name: string };
  getClass: () => { name: string };
}

function makeContext(method: string, role?: string): MockContext {
  const request: { method: string; user?: { role: string; sub: string } } = {
    method,
    user: role ? { role, sub: 'u1' } : undefined,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({ name: 'handler' }),
    getClass: () => ({ name: 'FeatureFlagsController' }),
  };
}

/**
 * Aplica metadata IS_PUBLIC_KEY em um handler para simular um handler
 * decorado com `@Public()`. Espelha o que NestJS faz em runtime.
 */
function makePublicHandler(): unknown {
  const handler = function (): void {
    /* noop */
  };
  Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  return handler;
}

describe('FeatureFlagAdminGuard (RNF-SEC-FF-01)', () => {
  let guard: FeatureFlagAdminGuard;
  let reflector: Reflector;

  beforeEach(() => {
    vi.clearAllMocks();
    reflector = new Reflector();
    // Guard agora requer Reflector para checar @Public() — vide MINOR #2.
    guard = new FeatureFlagAdminGuard(reflector);
  });

  describe('owner tem acesso total', () => {
    it('GET permitido', () => {
      const ok = guard.canActivate(makeContext('GET', 'owner') as never);
      expect(ok).toBe(true);
    });

    it('POST permitido', () => {
      const ok = guard.canActivate(makeContext('POST', 'owner') as never);
      expect(ok).toBe(true);
    });

    it('PATCH permitido', () => {
      const ok = guard.canActivate(makeContext('PATCH', 'owner') as never);
      expect(ok).toBe(true);
    });

    it('DELETE permitido', () => {
      const ok = guard.canActivate(makeContext('DELETE', 'owner') as never);
      expect(ok).toBe(true);
    });
  });

  describe('manager tem acesso somente leitura', () => {
    it('GET permitido', () => {
      expect(guard.canActivate(makeContext('GET', 'manager') as never)).toBe(true);
    });

    it('POST bloqueado', () => {
      expect(() => guard.canActivate(makeContext('POST', 'manager') as never)).toThrow(
        /Apenas owner|forbidden|403/i
      );
    });

    it('PATCH bloqueado', () => {
      expect(() => guard.canActivate(makeContext('PATCH', 'manager') as never)).toThrow();
    });

    it('DELETE bloqueado', () => {
      expect(() => guard.canActivate(makeContext('DELETE', 'manager') as never)).toThrow();
    });
  });

  describe('staff não tem acesso a nenhum método admin', () => {
    it('GET bloqueado', () => {
      expect(() => guard.canActivate(makeContext('GET', 'staff') as never)).toThrow();
    });

    it('POST bloqueado', () => {
      expect(() => guard.canActivate(makeContext('POST', 'staff') as never)).toThrow();
    });
  });

  describe('fail-closed', () => {
    it('sem user (sem JWT) lança 401', () => {
      expect(() => guard.canActivate(makeContext('GET') as never)).toThrow(/token|401/i);
    });

    it('user sem role lança 403', () => {
      // @ts-expect-error — testando ausência de claim
      const ctx = makeContext('GET');
      ctx.switchToHttp().getRequest().user = { sub: 'u1' };
      expect(() => guard.canActivate(ctx as never)).toThrow(/role.*ausente|403/i);
    });

    it('role desconhecida lança 403 (não escapa para owner)', () => {
      expect(() => guard.canActivate(makeContext('POST', 'superadmin') as never)).toThrow();
    });
  });

  describe('@Public() bypassa o guard (MINOR #2)', () => {
    it('handler com @Public() permite acesso sem user (200)', () => {
      // Em produção, o `@Public()` decorator aplica metadata IS_PUBLIC_KEY.
      // Aqui simulamos isso manualmente para validar a leitura via Reflector.
      const ctx = makeContext('GET');
      ctx.getHandler = () => makePublicHandler() as { name: string };

      // Sem user, sem role, sem nada — mas como a rota é @Public(), o guard
      // libera. Reflete o comportamento esperado de `/evaluate`.
      expect(() => guard.canActivate(ctx as never)).not.toThrow();
      expect(guard.canActivate(ctx as never)).toBe(true);
    });
  });
});
