/**
 * Feature Flags — compat layer (shim).
 *
 * Esta API é mantida para compatibilidade com os 11 callers existentes em
 * `apps/web/src/application/admin/services/*UseCase.ts` (RF-ADM-FF-*).
 *
 * Estratégia:
 *  - Leitura **síncrona** via env-var (preserva compat com SSR/testes e
 *    callers que não migraram para o hook React).
 *  - Quando o `FeatureFlagProvider` está montado, o hook `useFeatureFlag`
 *    expõe valores reativos. Esta camada é o fallback síncrono.
 *
 * Migração para o SDK reativo (opcional, não-bloqueante):
 *  - Onde houver `'use client'` + interatividade, prefira
 *    `useFeatureFlag<boolean>('pix_enabled', false)` do Provider.
 *  - Esta camada nunca lê o cache do client (chamadas são síncronas e
 *    desconhecem ciclo de vida do React).
 *
 * @see .openspec/changes/feature-flags-runtime/design.md §7
 *
 * ──────────────────────────────────────────────────────────────────────
 * 📦 Migração recomendada para o SDK `@pedi-ai/feature-flags`
 * ──────────────────────────────────────────────────────────────────────
 *
 * O pacote `@pedi-ai/feature-flags` (workspace em `packages/feature-flags/`)
 * oferece uma API tipada e reativa, com cache client-side e polling HTTP:
 *
 * ```tsx
 * // Substituir este shim (legado) por:
 * import { FeatureFlagProvider, useFeatureFlag } from '@pedi-ai/feature-flags';
 *
 * function App({ children }) {
 *   return (
 *     <FeatureFlagProvider apiBase="/api/v1/admin/feature-flags">
 *       {children}
 *     </FeatureFlagProvider>
 *   );
 * }
 *
 * function MinhaFeature({ flagKey }: { flagKey: string }) {
 *   const value = useFeatureFlag<boolean>(flagKey, false);
 *   return value ? <FeatureOn /> : <FeatureOff />;
 * }
 * ```
 *
 * Benefícios da migração:
 *  - Cache LRU client-side (zero chamadas repetidas à API)
 *  - Polling HTTP a cada 30 s com ETag/If-None-Match (RNF-PERF-FF-01)
 *  - Override por restaurante + usuário com rollout % (RF-ADM-FF-08)
 *  - Tipagem forte via Zod schema único (RNF-MAINT-FF-01)
 *
 * Este shim deve ser mantido até que **todos** os 11 callers em
 * `apps/web/src/application/admin/services/*UseCase.ts` migrem.
 *
 * @see packages/feature-flags/README.md
 * @see .openspec/changes/feature-flags-runtime/specs/RNF-MAINT-FF-01.md
 */

/** Lê boolean de env-var com strict equality em `'true'`. */
function readBooleanEnv(name: string): boolean {
  return process.env[name] === 'true';
}

/** Enable offline mode with service worker and local caching */
export function isOfflineEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED');
}

/** Enable PIX as a payment method */
export function isPixEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_FEATURE_PIX_ENABLED');
}

/** Enable waiter call / service mode */
export function isWaiterModeEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_FEATURE_WAITER_MODE');
}

/** Enable QR code menu scanning and generation */
export function isQrCodeEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED');
}

/** Enable combo/meal deal features */
export function isCombosEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_FEATURE_COMBOS_ENABLED');
}

/** Enable analytics dashboard and event tracking */
export function isAnalyticsEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED');
}

/** Enable cashback/rewards system */
export function isCashbackEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED');
}

/** Enable multi-restaurant support (N:N user-restaurant relationship) */
export function isMultiRestaurantEnabled(): boolean {
  return readBooleanEnv('NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT');
}

/**
 * Get a raw feature flag value.
 * @param name - Environment variable name (e.g., 'NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED')
 * @param defaultValue - Value to return if the env var is not set
 */
export function getFeatureFlag(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === 'true';
}
