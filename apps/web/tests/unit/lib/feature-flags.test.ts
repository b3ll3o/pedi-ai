import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as featureFlags from '@/lib/feature-flags'

// Save original env
const originalEnv = { ...process.env }

describe('feature-flags', () => {
  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv }
    // Clear all mocks
    vi.restoreAllMocks()
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('isOfflineEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED = 'true'
      expect(featureFlags.isOfflineEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED = 'false'
      expect(featureFlags.isOfflineEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED
      expect(featureFlags.isOfflineEnabled()).toBe(false)
    })
  })

  describe('isPixEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_PIX_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED = 'true'
      expect(featureFlags.isPixEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_PIX_ENABLED é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED = 'false'
      expect(featureFlags.isPixEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_PIX_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED
      expect(featureFlags.isPixEnabled()).toBe(false)
    })
  })

  describe('isStripeEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_STRIPE_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_STRIPE_ENABLED = 'true'
      expect(featureFlags.isStripeEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_STRIPE_ENABLED é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_STRIPE_ENABLED = 'false'
      expect(featureFlags.isStripeEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_STRIPE_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_STRIPE_ENABLED
      expect(featureFlags.isStripeEnabled()).toBe(false)
    })
  })

  describe('isWaiterModeEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_WAITER_MODE é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE = 'true'
      expect(featureFlags.isWaiterModeEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_WAITER_MODE é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE = 'false'
      expect(featureFlags.isWaiterModeEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_WAITER_MODE não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE
      expect(featureFlags.isWaiterModeEnabled()).toBe(false)
    })
  })

  describe('isQrCodeEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED = 'true'
      expect(featureFlags.isQrCodeEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED = 'false'
      expect(featureFlags.isQrCodeEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED
      expect(featureFlags.isQrCodeEnabled()).toBe(false)
    })
  })

  describe('isCombosEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_COMBOS_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED = 'true'
      expect(featureFlags.isCombosEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_COMBOS_ENABLED é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED = 'false'
      expect(featureFlags.isCombosEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_COMBOS_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED
      expect(featureFlags.isCombosEnabled()).toBe(false)
    })
  })

  describe('isAnalyticsEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED = 'true'
      expect(featureFlags.isAnalyticsEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED = 'false'
      expect(featureFlags.isAnalyticsEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED
      expect(featureFlags.isAnalyticsEnabled()).toBe(false)
    })
  })

  describe('isCashbackEnabled', () => {
    it('retorna true quando NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED = 'true'
      expect(featureFlags.isCashbackEnabled()).toBe(true)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED = 'false'
      expect(featureFlags.isCashbackEnabled()).toBe(false)
    })

    it('retorna false quando NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED
      expect(featureFlags.isCashbackEnabled()).toBe(false)
    })
  })

  describe('getFeatureFlag', () => {
    it('retorna true quando env var é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_TEST = 'true'
      expect(featureFlags.getFeatureFlag('NEXT_PUBLIC_FEATURE_TEST')).toBe(true)
    })

    it('retorna false quando env var é "false"', () => {
      process.env.NEXT_PUBLIC_FEATURE_TEST = 'false'
      expect(featureFlags.getFeatureFlag('NEXT_PUBLIC_FEATURE_TEST')).toBe(false)
    })

    it('retorna false (default) quando env var não está definida', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_TEST
      expect(featureFlags.getFeatureFlag('NEXT_PUBLIC_FEATURE_TEST')).toBe(false)
    })

    it('retorna defaultValue=true quando env var não está definida e default é true', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_TEST
      expect(featureFlags.getFeatureFlag('NEXT_PUBLIC_FEATURE_TEST', true)).toBe(true)
    })

    it('retorna false quando env var está vazia (mesmo com defaultValue=true)', () => {
      // Empty string is not undefined, so defaultValue is NOT used
      // Empty string === 'true' is false
      process.env.NEXT_PUBLIC_FEATURE_TEST = ''
      expect(featureFlags.getFeatureFlag('NEXT_PUBLIC_FEATURE_TEST', true)).toBe(false)
    })

    it('trata valores não-booleanos como false', () => {
      process.env.NEXT_PUBLIC_FEATURE_TEST = '1'
      expect(featureFlags.getFeatureFlag('NEXT_PUBLIC_FEATURE_TEST')).toBe(false)
    })

    it('trata "maybe" como false', () => {
      process.env.NEXT_PUBLIC_FEATURE_TEST = 'maybe'
      expect(featureFlags.getFeatureFlag('NEXT_PUBLIC_FEATURE_TEST')).toBe(false)
    })
  })
})
