'use client';

/**
 * @spec(RF-ADM-FF-08, RF-ADM-FF-10, RNF-MAINT-FF-01)
 *
 * Provider React para `FeatureFlagClient`. Exposição:
 *  - `<FeatureFlagProvider client={...} keys={[...]?}>{children}</FeatureFlagProvider>`
 *  - `useFeatureFlag<T>(key, fallback)` — leitura síncrona do cache.
 *  - `useFeatureFlags<T>(keys, fallback)` — múltiplas flags.
 *  - `useFeatureFlagClient()` — escape hatch para casos avançados.
 *
 * Comportamentos:
 *  - Provider inicia polling ao montar (se `keys` informado) — client-side only.
 *  - Hooks funcionam fora do Provider (retornam fallback) — degradação graciosa.
 *  - Re-renderiza quando o snapshot em memória muda (via subscribe).
 *
 * SSR:
 *  - Marcado `'use client'` para garantir que `useEffect` só roda no browser.
 *  - Para SSR com snapshot inicial, passe `<FeatureFlagProvider initialSnapshot={...}>`.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { FeatureFlagClient } from './FeatureFlagClient';
import type { EvaluationContext, FlagValue } from './types';

/**
 * Chaves canônicas do seed. Quando o Provider é usado sem `keys`, garantimos
 * que essas 8 flags sejam avaliadas periodicamente — cobre os pontos
 * `useFeatureFlag('pix_enabled')` espalhados pelo app sem configuração extra.
 */
const DEFAULT_POLLED_KEYS = [
  'offline_enabled',
  'pix_enabled',
  'waiter_mode_enabled',
  'qr_code_enabled',
  'combos_enabled',
  'analytics_enabled',
  'cashback_enabled',
  'multi_restaurant_enabled',
];

export interface FeatureFlagProviderProps {
  /** Client a ser usado. Se omitido, Provider opera em modo degradado (fallbacks). */
  client?: FeatureFlagClient;
  /** Keys a fazer polling. Se omitido, Provider usa as 8 chaves canônicas do seed. */
  keys?: string[];
  /** Contexto de avaliação para o polling. */
  context?: EvaluationContext;
  /** Snapshot inicial (SSR). Não dispara polling — apenas hidratação de cache. */
  initialSnapshot?: Record<string, FlagValue>;
  children: ReactNode;
}

interface FeatureFlagContextValue {
  client: FeatureFlagClient | null;
  snapshot: Record<string, FlagValue>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  client: null,
  snapshot: {},
});

export function FeatureFlagProvider({
  client,
  keys,
  context,
  initialSnapshot,
  children,
}: FeatureFlagProviderProps) {
  // Estado inicial derivado de initialSnapshot + snapshot do client.
  // Nenhum setState síncrono em useEffect.
  const [snapshot, setSnapshot] = useState<Record<string, FlagValue>>(() => {
    if (initialSnapshot) return { ...initialSnapshot };
    if (client) return { ...client.snapshot() };
    return {};
  });

  // Subscribe ao client para reatividade quando o snapshot muda.
  // A hidratação inicial vem do `useState(() => client.snapshot())`.
  // Aqui apenas assinamos — setSnapshot só é chamado dentro do callback
  // do subscribe (reação assíncrona a mudança externa), não no corpo do effect.
  useEffect(() => {
    if (!client) return;
    const unsubscribe = client.subscribe((next) => {
      setSnapshot({ ...next });
    });
    return unsubscribe;
  }, [client]);

  // Inicia polling quando há keys. Se o caller omitir `keys`, usamos as
  // 8 chaves canônicas do seed — garante que `useFeatureFlag('pix_enabled')`
  // veja valor fresco mesmo sem configuração explícita.
  useEffect(() => {
    if (!client) return;
    const effectiveKeys = keys && keys.length > 0 ? keys : DEFAULT_POLLED_KEYS;
    client.start(effectiveKeys, context ?? {});
    // Não paramos o polling no unmount — outros Providers podem depender dele.
    // O cliente gerencia seu próprio timer.
  }, [client, keys, context]);

  return (
    <FeatureFlagContext.Provider value={{ client: client ?? null, snapshot }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Hooks públicos
// ─────────────────────────────────────────────────────────────────────────

/**
 * Lê uma flag com fallback. Hook principal do front.
 * - Fora do Provider: retorna `fallback`.
 * - Sem valor avaliado ainda: retorna `fallback` (evita flash).
 */
export function useFeatureFlag<T = boolean>(key: string, fallback: T): T {
  const { client } = useContext(FeatureFlagContext);
  if (!client) return fallback;
  const value = client.get(key);
  return (value as T | undefined) ?? fallback;
}

/**
 * Lê várias flags de uma vez. Retorna `Record<key, fallback>` enquanto
 * nada estiver avaliado.
 */
export function useFeatureFlags<T = boolean>(keys: string[], fallback: T): Record<string, T> {
  const { client } = useContext(FeatureFlagContext);
  const result: Record<string, T> = {};
  for (const key of keys) {
    const value = client?.get(key);
    result[key] = (value as T | undefined) ?? fallback;
  }
  return result;
}

/** Acesso direto ao client para integrações avançadas. */
export function useFeatureFlagClient(): FeatureFlagClient | null {
  return useContext(FeatureFlagContext).client;
}

/** Snapshot atual (somente-leitura). */
export function useFeatureFlagSnapshot(): Record<string, FlagValue> {
  return useContext(FeatureFlagContext).snapshot;
}

// Re-export explícito para evitar tree-shaking do client em alguns bundlers.
export { FeatureFlagClient };
