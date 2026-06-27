/**
 * @spec(RF-ADM-FF-08, RNF-MAINT-FF-01)
 *
 * Tipos compartilhados do SDK de Feature Flags (front e back).
 * Mantém paridade com `packages/shared` para evitar drift entre os lados.
 *
 * Princípios:
 *  - Sem dependência de framework (React/Next ficam fora daqui).
 *  - Tipos derivados dos schemas Zod do backend quando existirem.
 */

export type FlagValue = unknown;

export type FlagValueType = 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';

export type OverrideScope = 'GLOBAL' | 'RESTAURANT' | 'USER';

/** Contexto de avaliação enviado para o backend via query string. */
export interface EvaluationContext {
  restaurantId?: string;
  userId?: string;
}

/** Config aceita pelo construtor do `FeatureFlagClient` no front. */
export interface FeatureFlagClientConfig {
  baseUrl: string;
  pollIntervalMs?: number;
  /** Chave do localStorage usada para cache de ETag. Default: `ff:etag`. */
  etagStorageKey?: string;
  /** Implementação customizada de fetch (testes). Default: `globalThis.fetch`. */
  fetcher?: typeof fetch;
}

/** Listener invocado quando o snapshot em memória muda. */
export type SnapshotListener = (snapshot: Record<string, FlagValue>) => void;
