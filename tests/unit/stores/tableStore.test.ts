import { describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react-dom/test-utils'

import { useTableStore } from '@/infrastructure/persistence/tableStore'

// ── Test isolation ────────────────────────────────────────────────────────────

async function resetStore() {
  useTableStore.setState({
    restaurantId: null,
    tableId: null,
    tableName: null,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('tableStore', () => {
  beforeEach(async () => {
    await resetStore()
  })

  describe('initial state', () => {
    it('has null values for all fields', () => {
      const state = useTableStore.getState()
      expect(state.restaurantId).toBeNull()
      expect(state.tableId).toBeNull()
      expect(state.tableName).toBeNull()
    })
  })

  describe('setTable', () => {
    it('sets restaurantId, tableId, and tableName', async () => {
      await act(async () => {
        useTableStore.getState().setTable('rest-123', 'table-5', 'Mesa 5')
      })

      const state = useTableStore.getState()
      expect(state.restaurantId).toBe('rest-123')
      expect(state.tableId).toBe('table-5')
      expect(state.tableName).toBe('Mesa 5')
    })

    it('can update existing values', async () => {
      await act(async () => {
        useTableStore.getState().setTable('rest-1', 'table-1', 'Mesa 1')
      })

      await act(async () => {
        useTableStore.getState().setTable('rest-2', 'table-2', 'Mesa 2')
      })

      const state = useTableStore.getState()
      expect(state.restaurantId).toBe('rest-2')
      expect(state.tableId).toBe('table-2')
      expect(state.tableName).toBe('Mesa 2')
    })
  })

  describe('clearTable', () => {
    it('resets all fields to null', async () => {
      await act(async () => {
        useTableStore.getState().setTable('rest-123', 'table-5', 'Mesa 5')
      })

      await act(async () => {
        useTableStore.getState().clearTable()
      })

      const state = useTableStore.getState()
      expect(state.restaurantId).toBeNull()
      expect(state.tableId).toBeNull()
      expect(state.tableName).toBeNull()
    })

    it('clearTable on already clear store works', async () => {
      await act(async () => {
        useTableStore.getState().clearTable()
      })

      const state = useTableStore.getState()
      expect(state.restaurantId).toBeNull()
      expect(state.tableId).toBeNull()
      expect(state.tableName).toBeNull()
    })
  })
})
