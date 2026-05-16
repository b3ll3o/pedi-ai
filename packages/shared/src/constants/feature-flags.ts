/**
 * Feature Flags - Constantes de negócio
 * Valores padrão para todos os flags de feature.
 * Para accesso runtime com env vars, usar @/lib/feature-flags.
 */

export const FeatureFlags = {
  OFFLINE_ENABLED: true,
  PIX_ENABLED: true,
  WAITER_MODE: true,
  QR_CODE_ENABLED: true,
  COMBOS_ENABLED: true,
  ANALYTICS_ENABLED: true,
  CASHBACK_ENABLED: false,
} as const;

export type FeatureFlagName = keyof typeof FeatureFlags;
