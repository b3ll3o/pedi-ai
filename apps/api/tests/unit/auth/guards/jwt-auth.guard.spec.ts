import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY, Public } from '../../../../src/auth/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let superCanActivate: ReturnType<typeof vi.fn>;
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    } as unknown as Reflector;

    guard = new JwtAuthGuard(reflector);

    // Patcha o `canActivate` no prototype do **pai** de JwtAuthGuard
    // (a classe gerada pelo mixin do AuthGuard('jwt')). É essa a função
    // que `super.canActivate(context)` invoca quando `JwtAuthGuard.canActivate`
    // decide prosseguir com auth.
    superCanActivate = vi.fn().mockResolvedValue(true);
    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    Object.defineProperty(parentProto, 'canActivate', {
      value: superCanActivate,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restaura o prototype do pai para evitar leak entre testes.
    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    delete parentProto.canActivate;
  });

  function makeContext(): ExecutionContext {
    const handler = function noop() {};
    const cls = class FakeController {};
    return {
      getHandler: () => handler,
      getClass: () => cls,
      switchToHttp: () => ({}) as never,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({}) as never,
      switchToWs: () => ({}) as never,
      getType: () => 'http',
      getRequest: () => ({}) as never,
      getResponse: () => ({}) as never,
      getNext: () => undefined,
    } as unknown as ExecutionContext;
  }

  it('pula o guard quando handler está marcado com @Public()', async () => {
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(true);
    context = makeContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('invoca super.canActivate quando NÃO está marcado como @Public()', async () => {
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(false);
    context = makeContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);
  });

  it('consulta o reflector com IS_PUBLIC_KEY, primeiro handler e depois class', async () => {
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(true);
    context = makeContext();

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('passa pelo super.canActivate quando reflector retorna undefined (não-public)', async () => {
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    context = makeContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);
  });

  it('rejeita (false) quando super.canActivate rejeita (token inválido)', async () => {
    superCanActivate.mockResolvedValueOnce(false);
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(false);
    context = makeContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('propaga exceção lançada por super.canActivate (erro de auth)', async () => {
    superCanActivate.mockRejectedValueOnce(new Error('jwt malformed'));
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(false);
    context = makeContext();

    await expect(guard.canActivate(context)).rejects.toThrow('jwt malformed');
  });

  it('decorator @Public() produz a chave de metadata correta', () => {
    // Garante que IS_PUBLIC_KEY não muda silenciosamente — quebraria
    // a integração com JwtAuthGuard.
    const target: Record<string, unknown> = {};
    const descriptor: PropertyDescriptor = {
      value: () => undefined,
      writable: false,
      enumerable: false,
      configurable: true,
    };

    const decorated = Public();
    decorated(target, 'method', descriptor);

    // SetMetadata é chamado com IS_PUBLIC_KEY=true. Refletimos via chave.
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, descriptor.value)).toBe(true);
  });
});
