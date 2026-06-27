'use client';

/**
 * @spec(RF-ADM-FF-03, RNF-SEC-FF-01)
 *
 * Hook client-side que executa `POST /api/v1/admin/feature-flags`.
 *
 * Princípios DDD:
 *  - Camada `application` (use case client-side).
 *  - Sem dependência de ToastProvider — caller decide como emitir feedback.
 *
 * Sucesso/erro são expostos via callbacks `onSuccess`/`onError` para preservar
 * reuso (mesmo padrão de `useAtualizarFeatureFlag`).
 */
import { useCallback, useState } from 'react';

import { logger } from '@/lib/logger';

export type FlagValueType = 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';

export interface CriarFeatureFlagInput {
  key: string;
  description?: string;
  valueType: FlagValueType;
  defaultValue: unknown;
}

export interface CriarFeatureFlagOptions {
  onSuccess?: (data: { id: string; key: string }) => void;
  onError?: (message: string) => void;
}

export interface CriarFeatureFlagResult {
  data: { id: string; key: string } | null;
  loading: boolean;
  error: string | null;
  criar: (
    input: CriarFeatureFlagInput,
    callbacks?: CriarFeatureFlagOptions
  ) => Promise<{ id: string; key: string } | null>;
  reset: () => void;
}

export function useCriarFeatureFlag(): CriarFeatureFlagResult {
  const [data, setData] = useState<{ id: string; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const criar = useCallback<CriarFeatureFlagResult['criar']>(async (input, callbacks) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          (errorBody as { message?: string; error?: string }).message ??
          (errorBody as { error?: string }).error ??
          `Erro ${response.status}`;
        setError(message);
        callbacks?.onError?.(message);
        return null;
      }

      const result = (await response.json().catch(() => null)) as {
        id: string;
        key: string;
      } | null;
      setData(result);
      if (result) callbacks?.onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('useCriarFeatureFlag', 'Falha no POST', {
        key: input.key,
        message,
      });
      setError(message);
      callbacks?.onError?.(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, criar, reset };
}
