/**
 * Feature Flags
 * Type-safe access to NEXT_PUBLIC_FEATURE_* environment variables.
 * All flags are client-side accessible (prefixed with NEXT_PUBLIC_).
 */

/** Enable offline mode with service worker and local caching */
export function isOfflineEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED === 'true';
}

/** Enable PIX as a payment method */
export function isPixEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED === 'true';
}

/** Enable waiter call / service mode */
export function isWaiterModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE === 'true';
}

/** Enable QR code menu scanning and generation */
export function isQrCodeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED === 'true';
}

/** Enable combo/meal deal features */
export function isCombosEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED === 'true';
}

/** Enable analytics dashboard and event tracking */
export function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED === 'true';
}

/** Enable cashback/rewards system */
export function isCashbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED === 'true';
}

/** Enable multi-restaurant support (N:N user-restaurant relationship) */
export function isMultiRestaurantEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT === 'true';
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
