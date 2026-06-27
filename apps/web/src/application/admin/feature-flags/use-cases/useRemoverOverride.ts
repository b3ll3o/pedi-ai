'use client';

/**
 * @spec(RF-ADM-FF-06, RNF-SEC-FF-01)
 *
 * Hook client-side que executa `DELETE /api/v1/admin/feature-flags/:key/overrides/:id`.
 *
 * Feedback:
 *  - Sucesso/erro expostos via callbacks `onSuccess`/`onError` (Task 7).
 */
import { useCallback, useState } from 'react';

import { logger } from '@/lib/logger';

export interface RemoverOverrideOptions {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export interface RemoverOverrideResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  remover: (key: string, id: string, options?: RemoverOverrideOptions) => Promise<boolean>;
  reset: () => void;
}

export function useRemoverOverride(): RemoverOverrideResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  const remover = useCallback<RemoverOverrideResult['remover']>(async (key, id, options) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch(`/api/v1/admin/feature-flags/${key}/overrides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok && response.status !== 404) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          (errorBody as { message?: string; error?: string }).message ??
          (errorBody as { error?: string }).error ??
          `Erro ${response.status}`;
        setError(message);
        options?.onError?.(message);
        return false;
      }

      setSuccess(true);
      options?.onSuccess?.();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('useRemoverOverride', 'Falha no DELETE', { key, id, message });
      setError(message);
      options?.onError?.(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, success, remover, reset };
}
