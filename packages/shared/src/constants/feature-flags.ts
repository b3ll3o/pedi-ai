/**
 * Feature Flags — Constantes de Negócio
 *
 * **FONTE DA VERDADE ÚNICA** das feature flags do Pedi-AI.
 * - Defaults estão aqui.
 * - Para acesso runtime (env vars), usar `apps/web/src/lib/feature-flags.ts`.
 * - Toda flag **MUST** estar também em `.env.example` (sincronizada).
 *
 * Para adicionar nova flag:
 *   1. Adicionar entrada em `FeatureFlagMetadata` com `owner`, `since`, `spec?`.
 *   2. Adicionar a env var correspondente em `.env.example` e `apps/web/src/lib/feature-flags.ts`.
 *   3. Se a flag é nova, marcar `since` com a data de hoje.
 *   4. Se for substituída por outra, marcar `deprecatedAt` + `replacedBy`.
 */

export interface FeatureFlagMetadata {
  /** Valor padrão (default runtime). */
  defaultValue: boolean;
  /** Time/pessoa responsável. */
  owner: string;
  /** Data de introdução (YYYY-MM-DD). */
  since: string;
  /** Data de deprecação (YYYY-MM-DD). Opcional. */
  deprecatedAt?: string;
  /** ID da flag que substituiu esta. Opcional. */
  replacedBy?: FeatureFlagName;
  /** RF/RNF correspondente (se aplicável). Opcional. */
  spec?: string;
  /** Notas curtas. Opcional. */
  notes?: string;
}

export const FeatureFlagMetadata: Record<string, FeatureFlagMetadata> = {
  OFFLINE_ENABLED: {
    defaultValue: true,
    owner: 'Time Plataforma',
    since: '2026-04-01',
    spec: 'RNF-AVAIL-02',
    notes: 'Service Worker + Dexie + BackgroundSync.',
  },
  PIX_ENABLED: {
    defaultValue: true,
    owner: 'Time Pagamento',
    since: '2026-04-01',
    spec: 'RF-PAY-01..08',
  },
  QR_CODE_ENABLED: {
    defaultValue: true,
    owner: 'Time Mesa',
    since: '2026-04-01',
    spec: 'RF-TABLE-01..06',
  },
  COMBOS_ENABLED: {
    defaultValue: true,
    owner: 'Time Cardápio',
    since: '2026-05-01',
    spec: 'RF-MENU-07',
  },
  WAITER_MODE: {
    defaultValue: true,
    owner: 'Time Plataforma',
    since: '2026-05-15',
    notes: 'Sem RF formal ainda; mantido ativo por default para dev.',
  },
  ANALYTICS_ENABLED: {
    defaultValue: true,
    owner: 'Time Admin',
    since: '2026-05-15',
    spec: 'RF-ADM-10',
  },
  MULTI_RESTAURANT_ENABLED: {
    defaultValue: false,
    owner: 'Time Admin',
    since: '2026-05-01',
    spec: 'RF-ADM-09',
    notes: 'Planejado para Q4/2026. Mantido false em .env até release.',
  },
  CASHBACK_ENABLED: {
    defaultValue: false,
    owner: 'Time Plataforma',
    since: '2026-04-01',
    notes: '⏸️ Sem RF/RNF atual. Marcado para review em Q1/2027.',
  },
} as const;

/**
 * Defaults das feature flags — derivado do metadata acima.
 * NÃO editar diretamente: editar `FeatureFlagMetadata`.
 */
export const FeatureFlags: Record<string, boolean> = Object.fromEntries(
  Object.entries(FeatureFlagMetadata).map(([name, meta]) => [name, meta.defaultValue])
) as Record<FeatureFlagName, boolean>;

export type FeatureFlagName = keyof typeof FeatureFlagMetadata;

/**
 * Verifica se uma flag está deprecada.
 */
export function isFeatureFlagDeprecated(name: FeatureFlagName): boolean {
  return FeatureFlagMetadata[name]?.deprecatedAt !== undefined;
}

/**
 * Retorna o nome da flag que substituiu a flag dada, ou `null`.
 */
export function getReplacement(name: FeatureFlagName): FeatureFlagName | null {
  return FeatureFlagMetadata[name]?.replacedBy ?? null;
}
