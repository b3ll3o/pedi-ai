import { describe, it, expect } from 'vitest'
import {
  isOfflineEnabled,
  isPixEnabled,
  isWaiterModeEnabled,
  isQrCodeEnabled,
  isCombosEnabled,
  isAnalyticsEnabled,
  isCashbackEnabled,
  isMultiRestaurantEnabled,
  getFeatureFlag,
} from '@/lib/feature-flags'

describe('Feature Flags', () => {
  describe('isOfflineEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED = 'true'
      expect(isOfflineEnabled()).toBe(true)
    })

    it('deve retornar false quando NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED não é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED = 'false'
      expect(isOfflineEnabled()).toBe(false)
    })

    it('deve retornar false quando NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED não está definido', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED
      expect(isOfflineEnabled()).toBe(false)
    })
  })

  describe('isPixEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_FEATURE_PIX_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED = 'true'
      expect(isPixEnabled()).toBe(true)
    })

    it('deve retornar false quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED
      expect(isPixEnabled()).toBe(false)
    })
  })

  describe('isWaiterModeEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_FEATURE_WAITER_MODE é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE = 'true'
      expect(isWaiterModeEnabled()).toBe(true)
    })

    it('deve retornar false quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE
      expect(isWaiterModeEnabled()).toBe(false)
    })
  })

  describe('isQrCodeEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED = 'true'
      expect(isQrCodeEnabled()).toBe(true)
    })

    it('deve retornar false quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED
      expect(isQrCodeEnabled()).toBe(false)
    })
  })

  describe('isCombosEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_FEATURE_COMBOS_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED = 'true'
      expect(isCombosEnabled()).toBe(true)
    })

    it('deve retornar false quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED
      expect(isCombosEnabled()).toBe(false)
    })
  })

  describe('isAnalyticsEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED = 'true'
      expect(isAnalyticsEnabled()).toBe(true)
    })

    it('deve retornar false quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED
      expect(isAnalyticsEnabled()).toBe(false)
    })
  })

  describe('isCashbackEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED é "true"', () => {
      process.env.NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED = 'true'
      expect(isCashbackEnabled()).toBe(true)
    })

    it('deve retornar false quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED
      expect(isCashbackEnabled()).toBe(false)
    })
  })

  describe('isMultiRestaurantEnabled', () => {
    it('deve retornar true quando NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT é "true"', () => {
      process.env.NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT = 'true'
      expect(isMultiRestaurantEnabled()).toBe(true)
    })

    it('deve retornar false quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT
      expect(isMultiRestaurantEnabled()).toBe(false)
    })
  })

  describe('getFeatureFlag', () => {
    it('deve retornar true para flag "true"', () => {
      process.env.NEXT_PUBLIC_TEST_FLAG = 'true'
      expect(getFeatureFlag('NEXT_PUBLIC_TEST_FLAG')).toBe(true)
    })

    it('deve retornar false para flag "false"', () => {
      process.env.NEXT_PUBLIC_TEST_FLAG = 'false'
      expect(getFeatureFlag('NEXT_PUBLIC_TEST_FLAG')).toBe(false)
    })

    it('deve retornar defaultValue quando flag não está definida', () => {
      delete process.env.NEXT_PUBLIC_TEST_FLAG
      expect(getFeatureFlag('NEXT_PUBLIC_TEST_FLAG')).toBe(false)
      expect(getFeatureFlag('NEXT_PUBLIC_TEST_FLAG', true)).toBe(true)
    })

    it('deve retornar defaultValue personalizado', () => {
      delete process.env.NEXT_PUBLIC_TEST_FLAG
      expect(getFeatureFlag('NEXT_PUBLIC_TEST_FLAG', true)).toBe(true)
    })
  })
})
