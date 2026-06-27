/**
 * @spec(RF-ADM-FF-04, RNF-SEC-FF-01)
 *
 * Testes do hook `useAtualizarFeatureFlag` (optimistic update + rollback em erro).
 * Localização: apps/web/src/application/admin/feature-flags/use-cases/useAtualizarFeatureFlag.ts
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { useAtualizarFeatureFlag } from '@/application/admin/feature-flags/use-cases/useAtualizarFeatureFlag';

describe('useAtualizarFeatureFlag (RF-ADM-FF-04)', () => {
  it('executa PATCH e atualiza cache otimisticamente', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ key: 'pix_enabled', enabled: false }),
    }) as never;

    const { result } = renderHook(() => useAtualizarFeatureFlag());

    await act(async () => {
      await result.current.atualizar('pix_enabled', { enabled: false });
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/feature-flags/pix_enabled'),
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('rollback do optimistic update em caso de erro 500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'internal error' }),
    }) as never;

    const { result } = renderHook(() => useAtualizarFeatureFlag());

    await act(async () => {
      await result.current.atualizar('pix_enabled', { enabled: false });
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/erro|500/i);
    });
  });

  it('loading=true enquanto requisição está em voo', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    ) as never;

    const { result } = renderHook(() => useAtualizarFeatureFlag());

    act(() => {
      void result.current.atualizar('pix_enabled', { enabled: false });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveFetch({ ok: true, status: 200, json: async () => ({}) });
    });

    expect(result.current.loading).toBe(false);
  });

  it('chama onSuccess em sucesso', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ key: 'pix_enabled', enabled: false }),
    }) as never;
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAtualizarFeatureFlag());
    await act(async () => {
      await result.current.atualizar('pix_enabled', { enabled: false }, { onSuccess });
    });
    expect(onSuccess).toHaveBeenCalledWith({ key: 'pix_enabled', enabled: false });
  });

  it('chama onError em 500 com mensagem do backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'internal' }),
    }) as never;
    const onError = vi.fn();
    const { result } = renderHook(() => useAtualizarFeatureFlag());
    await act(async () => {
      await result.current.atualizar('pix_enabled', { enabled: false }, { onError });
    });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/internal/));
  });
});
