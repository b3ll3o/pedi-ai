'use client';

/**
 * @spec(RF-ADM-FF-05, RNF-SEC-FF-01)
 *
 * Hook client-side que executa `POST /api/v1/admin/feature-flags/:key/overrides`.
 *
 * Feedback:
 *  - Sucesso/erro expostos via callbacks `onSuccess`/`onError` (Task 7).
 */
import { useCallback, useState } from 'react';

import { logger } from '@/lib/logger';

export interface AdicionarOverrideInput {
  scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
  scopeId?: string | null;
  value: unknown;
  rolloutPct?: number;
  expiresAt?: string;
}

export interface AdicionarOverrideOptions {
  onSuccess?: (data: { id: string }) => void;
  onError?: (message: string) => void;
}

export interface AdicionarOverrideResult {
  data: { id: string } | null;
  loading: boolean;
  error: string | null;
  adicionar: (
    key: string,
    payload: AdicionarOverrideInput,
    options?: AdicionarOverrideOptions
  ) => Promise<{ id: string } | null>;
  reset: () => void;
}

export function useAdicionarOverride(): AdicionarOverrideResult {
  const [data, setData] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const adicionar = useCallback<AdicionarOverrideResult['adicionar']>(
    async (key, payload, options) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/admin/feature-flags/${key}/overrides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            (errorBody as { message?: string; error?: string }).message ??
            (errorBody as { error?: string }).error ??
            `Erro ${response.status}`;
          setError(message);
          options?.onError?.(message);
          return null;
        }

        const result = (await response.json().catch(() => null)) as { id: string } | null;
        setData(result);
        if (result) options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        logger.error('useAdicionarOverride', 'Falha no POST', { key, message });
        setError(message);
        options?.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, loading, error, adicionar, reset };
}
