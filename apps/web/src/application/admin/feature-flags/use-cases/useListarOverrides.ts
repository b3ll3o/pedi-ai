'use client';

/**
 * @spec(RF-ADM-FF-07)
 *
 * Hook client-side que executa `GET /api/v1/admin/feature-flags/:key/overrides`.
 */
import { useCallback, useState } from 'react';

import { logger } from '@/lib/logger';

export interface OverrideRecord {
  id: string;
  scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
  scopeId: string | null;
  value: unknown;
  rolloutPct?: number;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ListarOverridesResult {
  overrides: OverrideRecord[];
  loading: boolean;
  error: string | null;
  buscar: () => Promise<void>;
  reset: () => void;
}

export function useListarOverrides(flagKey: string): ListarOverridesResult {
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setOverrides([]);
    setError(null);
    setLoading(false);
  }, []);

  const buscar = useCallback(async () => {
    if (!flagKey) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/feature-flags/${flagKey}/overrides`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          (errorBody as { message?: string; error?: string }).message ??
          (errorBody as { error?: string }).error ??
          `Erro ${response.status}`;
        setError(message);
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        data?: OverrideRecord[];
      };
      setOverrides(body.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('useListarOverrides', 'Falha no GET', { flagKey, message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [flagKey]);

  return { overrides, loading, error, buscar, reset };
}
