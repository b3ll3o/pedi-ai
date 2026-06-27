import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// @ts-expect-error — módulo em implementação
import { useCriarFeatureFlag } from '@/application/admin/feature-flags/use-cases/useCriarFeatureFlag';

describe('useCriarFeatureFlag (RF-ADM-FF-03)', () => {
  it('executa POST com payload correto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'flag-1', key: 'pix_enabled' }),
    }) as never;

    const { result } = renderHook(() => useCriarFeatureFlag());
    await act(async () => {
      await result.current.criar({
        key: 'pix_enabled',
        description: 'Habilita PIX',
        valueType: 'BOOLEAN',
        defaultValue: false,
      });
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/admin/feature-flags',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          key: 'pix_enabled',
          description: 'Habilita PIX',
          valueType: 'BOOLEAN',
          defaultValue: false,
        }),
      })
    );
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ id: 'flag-1', key: 'pix_enabled' });
  });

  it('propaga mensagem do backend em erro 400', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'key deve estar em snake_case' }),
    }) as never;

    const { result } = renderHook(() => useCriarFeatureFlag());
    await act(async () => {
      await result.current.criar({
        key: 'CHAVE-INVALIDA',
        valueType: 'BOOLEAN',
        defaultValue: false,
      });
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/snake_case/);
    });
  });

  it('loading=true durante a requisição', () => {
    let resolveFetch: (value: unknown) => void = () => {};
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    ) as never;

    const { result } = renderHook(() => useCriarFeatureFlag());
    act(() => {
      void result.current.criar({ key: 'x_y', valueType: 'BOOLEAN', defaultValue: true });
    });
    expect(result.current.loading).toBe(true);

    return act(async () => {
      resolveFetch({ ok: true, status: 201, json: async () => ({}) });
    });
  });
});
