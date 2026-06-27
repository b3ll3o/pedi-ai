/**
 * @spec(RF-ADM-FF-08, RF-ADM-FF-10, RNF-MAINT-FF-01)
 *
 * Testes do `FeatureFlagProvider` + hook `useFeatureFlag`.
 * Foco em:
 *  - Provider expõe client via context.
 *  - Hook retorna valor tipado.
 *  - Fallback funciona sem Provider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { FeatureFlagProvider, useFeatureFlag } from '../../src/FeatureFlagProvider';
import { FeatureFlagClient } from '../../src/FeatureFlagClient';

describe('FeatureFlagProvider + useFeatureFlag (front)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ pix_enabled: true, combos_enabled: false }),
    }) as never;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('useFeatureFlag retorna fallback quando fora do Provider', () => {
    const { result } = renderHook(() => useFeatureFlag('pix_enabled', false));
    expect(result.current).toBe(false);
  });

  it('useFeatureFlag retorna valor do client quando dentro do Provider', async () => {
    const client = new FeatureFlagClient({
      baseUrl: '/api/v1/admin/feature-flags',
      pollIntervalMs: 30_000,
    });
    // Pré-popula o cache
    await client.evaluate(['pix_enabled', 'combos_enabled'], {});

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FeatureFlagProvider client={client}>{children}</FeatureFlagProvider>
    );

    const { result } = renderHook(() => useFeatureFlag('pix_enabled', false), { wrapper });
    expect(result.current).toBe(true);
  });

  it('useFeatureFlag aceita tipo genérico T', () => {
    const { result } = renderHook(() => useFeatureFlag<string>('feature_x', 'fallback'));
    expect(result.current).toBe('fallback');
  });

  it('Provider inicia polling quando monta', async () => {
    const client = new FeatureFlagClient({
      baseUrl: '/api/v1/admin/feature-flags',
      pollIntervalMs: 30_000,
    });

    renderHook(() => useFeatureFlag('pix_enabled', false), {
      wrapper: ({ children }) => (
        <FeatureFlagProvider client={client}>{children}</FeatureFlagProvider>
      ),
    });

    // Avança 0 — fetch inicial deve ter sido disparado pelo Provider
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
