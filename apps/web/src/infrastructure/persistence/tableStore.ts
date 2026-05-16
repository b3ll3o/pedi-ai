'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ───────────────────────────────────────────────────

export interface TableState {
  restaurantId: string | null;
  tableId: string | null;
  tableName: string | null;
}

export interface TableActions {
  setTable: (restaurantId: string, tableId: string, tableName: string) => void;
  clearTable: () => void;
}

export type TableStore = TableState & TableActions;

// ── Initial State ───────────────────────────────────────────

const initialState: TableState = {
  restaurantId: null,
  tableId: null,
  tableName: null,
};

// ── Store ────────────────────────────────────────────────────

export const useTableStore = create<TableStore>()(
  persist(
    (set) => ({
      ...initialState,

      setTable: (restaurantId, tableId, tableName) =>
        set({
          restaurantId,
          tableId,
          tableName,
        }),

      clearTable: () => set(initialState),
    }),
    {
      name: 'pedi-ai-table',
    }
  )
);
