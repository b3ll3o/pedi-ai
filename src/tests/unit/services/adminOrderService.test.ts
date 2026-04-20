import { describe, it, expect } from 'vitest'
import {
  isValidStatusTransition,
  getAllowedTransitions,
  getOrderAge,
  getOrderAgeDisplay,
  isOrderStale,
} from '@/services/adminOrderService'

describe('adminOrderService', () => {
  describe('isValidStatusTransition', () => {
    it('pending can transition to confirmed', () => {
      expect(isValidStatusTransition('pending', 'confirmed')).toBe(true)
    })

    it('pending can transition to cancelled', () => {
      expect(isValidStatusTransition('pending', 'cancelled')).toBe(true)
    })

    it('pending cannot transition to preparing', () => {
      expect(isValidStatusTransition('pending', 'preparing')).toBe(false)
    })

    it('confirmed can transition to preparing', () => {
      expect(isValidStatusTransition('confirmed', 'preparing')).toBe(true)
    })

    it('confirmed can transition to cancelled', () => {
      expect(isValidStatusTransition('confirmed', 'cancelled')).toBe(true)
    })

    it('preparing can transition to ready', () => {
      expect(isValidStatusTransition('preparing', 'ready')).toBe(true)
    })

    it('ready can transition to delivered', () => {
      expect(isValidStatusTransition('ready', 'delivered')).toBe(true)
    })

    it('delivered cannot transition to any status', () => {
      expect(isValidStatusTransition('delivered', 'pending')).toBe(false)
      expect(isValidStatusTransition('delivered', 'cancelled')).toBe(false)
    })

    it('cancelled cannot transition to any status', () => {
      expect(isValidStatusTransition('cancelled', 'pending')).toBe(false)
      expect(isValidStatusTransition('cancelled', 'delivered')).toBe(false)
    })

    it('cannot skip statuses', () => {
      expect(isValidStatusTransition('pending', 'ready')).toBe(false)
      expect(isValidStatusTransition('pending', 'delivered')).toBe(false)
      expect(isValidStatusTransition('confirmed', 'ready')).toBe(false)
    })
  })

  describe('getAllowedTransitions', () => {
    it('returns correct transitions for pending', () => {
      expect(getAllowedTransitions('pending')).toEqual(['confirmed', 'cancelled'])
    })

    it('returns correct transitions for confirmed', () => {
      expect(getAllowedTransitions('confirmed')).toEqual(['preparing', 'cancelled'])
    })

    it('returns correct transitions for preparing', () => {
      expect(getAllowedTransitions('preparing')).toEqual(['ready', 'cancelled'])
    })

    it('returns correct transitions for ready', () => {
      expect(getAllowedTransitions('ready')).toEqual(['delivered', 'cancelled'])
    })

    it('returns empty array for delivered', () => {
      expect(getAllowedTransitions('delivered')).toEqual([])
    })

    it('returns empty array for cancelled', () => {
      expect(getAllowedTransitions('cancelled')).toEqual([])
    })
  })

  describe('getOrderAge', () => {
    it('returns age in seconds', () => {
      const order = {
        id: '1',
        created_at: new Date(Date.now() - 60000).toISOString(), // 60 seconds ago
      } as any

      const age = getOrderAge(order)
      expect(age).toBeGreaterThanOrEqual(59)
      expect(age).toBeLessThanOrEqual(61)
    })

    it('returns 0 for very recent orders', () => {
      const order = {
        id: '1',
        created_at: new Date().toISOString(),
      } as any

      const age = getOrderAge(order)
      expect(age).toBeLessThan(2)
    })
  })

  describe('getOrderAgeDisplay', () => {
    it('displays seconds for < 60s', () => {
      expect(getOrderAgeDisplay(30)).toBe('30s')
      expect(getOrderAgeDisplay(59)).toBe('59s')
    })

    it('displays minutes and seconds for < 60m', () => {
      expect(getOrderAgeDisplay(60)).toBe('1m 0s')
      expect(getOrderAgeDisplay(90)).toBe('1m 30s')
      expect(getOrderAgeDisplay(300)).toBe('5m 0s')
    })

    it('displays hours and minutes for >= 60m', () => {
      expect(getOrderAgeDisplay(3600)).toBe('1h 0m')
      expect(getOrderAgeDisplay(3660)).toBe('1h 1m')
      expect(getOrderAgeDisplay(7200)).toBe('2h 0m')
    })
  })

  describe('isOrderStale', () => {
    it('returns false for recent orders', () => {
      const order = {
        id: '1',
        created_at: new Date(Date.now() - 60000).toISOString(),
      } as any

      expect(isOrderStale(order, 300)).toBe(false)
    })

    it('returns true for old orders', () => {
      const order = {
        id: '1',
        created_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      } as any

      expect(isOrderStale(order, 300)).toBe(true)
    })

    it('uses default threshold of 300 seconds', () => {
      const order = {
        id: '1',
        created_at: new Date(Date.now() - 400000).toISOString(),
      } as any

      expect(isOrderStale(order)).toBe(true)
    })
  })
})
