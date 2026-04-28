/**
 * Feature Configuration
 * Centralized defaults and documentation for all feature flags.
 * Import helpers from @lib/feature-flags instead of accessing these directly.
 */

export const FeatureFlags = {
  /**
   * Offline Mode
   * Default: true
   * Enables service worker caching and offline-first browsing.
   */
  OFFLINE_ENABLED: true,

  /**
   * PIX Payment
   * Default: true
   * Enables PIX instant payment method at checkout.
   */
  PIX_ENABLED: true,

  /**
   * Waiter Mode
   * Default: true
   * Enables waiter call button and service request flow.
   */
  WAITER_MODE: true,

  /**
   * QR Code
   * Default: true
   * Enables QR code generation for table/menu sharing.
   */
  QR_CODE_ENABLED: true,

  /**
   * Combos
   * Default: true
   * Enables combo/meal deal product configuration and ordering.
   */
  COMBOS_ENABLED: true,

  /**
   * Analytics
   * Default: true
   * Enables analytics events, page views, and dashboard metrics.
   */
  ANALYTICS_ENABLED: true,

  /**
   * Cashback
   * Default: false
   * Enables cashback credits and rewards program.
   */
  CASHBACK_ENABLED: false,
} as const;

export type FeatureFlagName = keyof typeof FeatureFlags;
