'use client';

/**
 * @spec(RF-ADM-FF-04, RNF-SEC-FF-01)
 *
 * Hook client-side que executa `PATCH /api/v1/admin/feature-flags/:key`.
 * Implementa **optimistic update** + rollback automático em erro.
 *
 * Princípios DDD:
 *  - Pertence à camada `application` (use case client-side).
 *  - Sem dependência de React fora de hooks.
 *  - Estado (`loading`, `error`, `data`) é local ao componente.
 *
 * Estratégia de optimistic update:
 *  - Cacheia o valor anterior em `previousValue` (opcionalmente via callback).
 *  - Chama `PATCH`.
 *  - Em erro: reverte via callback `onRollback(previousValue)`.
 *  - Em sucesso: nada a fazer — o próximo polling (≤30s) propaga a mudança.
 *
 * Feedback:
 *  - Sucesso/erro são expostos via callbacks `onSuccess`/`onError` (Task 7).
 *  - Caller decide se emite toast ou apenas loga — mantém hook testável.
 */
import { useCallback, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';

export interface AtualizarFeatureFlagInput {
  description?: string;
  defaultValue?: unknown;
  enabled?: boolean;
}

export interface AtualizarFeatureFlagOptions {
  onOptimistic?: () => void;
  onRollback?: () => void;
  onSuccess?: (data: unknown) => void;
  onError?: (message: string) => void;
}

export interface AtualizarFeatureFlagResult {
  data: unknown | null;
  loading: boolean;
  error: string | null;
  atualizar: (
    key: string,
    payload: AtualizarFeatureFlagInput,
    options?: AtualizarFeatureFlagOptions
  ) => Promise<unknown | null>;
  reset: () => void;
}

async function readErrorMessage(response: Response, fallbackStatus: number): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return (
    (body as { message?: string; error?: string }).message ??
    (body as { error?: string }).error ??
    `Erro ${fallbackStatus}`
  );
}

async function readSuccessBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function notifyError(options: AtualizarFeatureFlagOptions | undefined, message: string): void {
  options?.onRollback?.();
  options?.onError?.(message);
}

function notifySuccess(options: AtualizarFeatureFlagOptions | undefined, result: unknown): void {
  options?.onSuccess?.(result);
}

export function useAtualizarFeatureFlag(): AtualizarFeatureFlagResult {
  const [data, setData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const atualizar = useCallback<AtualizarFeatureFlagResult['atualizar']>(
    async (key, payload, options) => {
      setLoading(true);
      setError(null);
      options?.onOptimistic?.();

      try {
        const response = await fetch(`/api/v1/admin/feature-flags/${key}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await readErrorMessage(response, response.status);
          setError(message);
          notifyError(options, message);
          return null;
        }

        const result = await readSuccessBody(response);
        setData(result);
        notifySuccess(options, result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        logger.error('useAtualizarFeatureFlag', 'Falha no PATCH', { key, message });
        setError(message);
        notifyError(options, message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, loading, error, atualizar, reset };
}

// Reuso interno: alguns testes isolam via apiClient diretamente.
export { apiClient };
