/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-06, RF-ADM-FF-07)
 *
 * Testes dos hooks client-side para overrides.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { useAdicionarOverride } from '@/application/admin/feature-flags/use-cases/useAdicionarOverride';
// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { useRemoverOverride } from '@/application/admin/feature-flags/use-cases/useRemoverOverride';
// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { useListarOverrides } from '@/application/admin/feature-flags/use-cases/useListarOverrides';

describe('useAdicionarOverride (RF-ADM-FF-05)', () => {
  it('POST /:key/overrides com payload correto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'ov_1' }),
    }) as never;

    const { result } = renderHook(() => useAdicionarOverride());

    await act(async () => {
      await result.current.adicionar('pix_enabled', {
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        value: true,
      });
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/feature-flags/pix_enabled/overrides'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('chama onSuccess ao criar override', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'ov_99' }),
    }) as never;
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAdicionarOverride());
    await act(async () => {
      await result.current.adicionar(
        'pix_enabled',
        { scope: 'GLOBAL', value: true },
        { onSuccess }
      );
    });
    expect(onSuccess).toHaveBeenCalledWith({ id: 'ov_99' });
  });

  it('chama onError em erro do backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'scopeId inválido' }),
    }) as never;
    const onError = vi.fn();
    const { result } = renderHook(() => useAdicionarOverride());
    await act(async () => {
      await result.current.adicionar('pix_enabled', { scope: 'GLOBAL', value: true }, { onError });
    });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/scopeId/));
  });
});

describe('useRemoverOverride (RF-ADM-FF-06)', () => {
  it('DELETE /:key/overrides/:id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    }) as never;

    const { result } = renderHook(() => useRemoverOverride());

    await act(async () => {
      await result.current.remover('pix_enabled', 'ov_1');
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/feature-flags/pix_enabled/overrides/ov_1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('useListarOverrides (RF-ADM-FF-07)', () => {
  it('GET /:key/overrides retorna array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 'ov_1', scope: 'GLOBAL', scopeId: null }],
      }),
    }) as never;

    const { result } = renderHook(() => useListarOverrides('pix_enabled'));

    await act(async () => {
      await result.current.buscar();
    });

    expect(result.current.overrides).toHaveLength(1);
    expect(result.current.overrides[0].scope).toBe('GLOBAL');
  });
});
