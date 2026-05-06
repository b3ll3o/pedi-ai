'use client';

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/lib/offline/db';
import type { CartItem as DBCartItem } from '@/lib/offline/types';
import { createBroadcastChannelManager, type BroadcastChannelManager } from '@/lib/broadcast-channel';

// ── BroadcastChannel Sync (delegated to separate module) ────────

// Singleton instance - lazily initialized
let channelManager: BroadcastChannelManager | null = null;

function getChannelManager(): BroadcastChannelManager {
  if (!channelManager) {
    channelManager = createBroadcastChannelManager();
  }
  return channelManager;
}

/**
 * Broadcast cart update to other tabs (browser-only).
 * Guards with typeof check to prevent server-side errors.
 */
function broadcastCartUpdate(items: CartItem[]): void {
  getChannelManager().broadcastCartUpdate(items);
}

/**
 * Listen for cart updates from other tabs.
 * Returns cleanup function. Browser-only.
 */
function listenForCartUpdates(callback: (items: CartItem[]) => void): () => void {
  return getChannelManager().listenForCartUpdates(callback);
}

// ── Types ────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: SelectedModifier[];
  notes?: string;
  comboId?: string;
  bundlePrice?: number;
  comboItems?: {
    productId: string;
    quantity: number;
  }[];
  createdAt: Date;
}

export interface SelectedModifier {
  group_id: string;
  group_name: string;
  modifier_id: string;
  name: string;
  price_adjustment: number;
}

export interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  isOpen: boolean;
}

// ── Validation Types ──────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Cart Actions ─────────────────────────────────────────────

interface CartActions {
  setRestaurantId: (restaurantId: string | null) => void;
  addItem: (item: Omit<CartItem, 'id' | 'createdAt'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  validateCart: (restaurantId: string, tableId?: string) => Promise<ValidationResult>;
}

export type CartStore = CartState & CartActions;

// ── IndexedDB Helpers ────────────────────────────────────────

let isHydratingFromIndexedDB = false;

async function persistCartToIndexedDB(items: CartItem[]) {
  // Don't persist if we're currently hydrating from IndexedDB
  if (isHydratingFromIndexedDB) return;

  await db.cart.clear();
  if (items.length === 0) return;

  const dbItems: DBCartItem[] = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    modifiers: item.modifiers as unknown as Record<string, unknown>,
    price: item.unitPrice * item.quantity,
    createdAt: item.createdAt,
  }));

  await db.cart.bulkAdd(dbItems);
}

export async function hydrateCartFromIndexedDB() {
  const dbItems = await db.cart.toArray();
  if (dbItems.length === 0) return;

  isHydratingFromIndexedDB = true;

  const items: CartItem[] = dbItems.map((dbItem) => {
    const modifiers = (dbItem.modifiers as unknown as SelectedModifier[]) || [];
    return {
      id: String(dbItem.id),
      productId: dbItem.productId,
      name: '',
      quantity: dbItem.quantity,
      unitPrice: 0,
      modifiers: modifiers,
      notes: undefined,
      comboId: undefined,
      bundlePrice: undefined,
      createdAt: dbItem.createdAt,
    };
  });

  useCartStore.setState({ items });

  isHydratingFromIndexedDB = false;
}

// ── Initial State ─────────────────────────────────────────────

const initialState: CartState = {
  items: [],
  restaurantId: null,
  isOpen: false,
};

// ── Store ─────────────────────────────────────────────────────

export const useCartStore = create<CartStore>()(
  persist(
    subscribeWithSelector(
      immer((set) => ({
        ...initialState,

        setRestaurantId: (restaurantId) =>
          set((state) => {
            state.restaurantId = restaurantId;
          }),

        addItem: (item) =>
          set((state) => {
            const newItem: CartItem = {
              ...item,
              id: crypto.randomUUID(),
              createdAt: new Date(),
            };
            state.items.push(newItem);
          }),

        removeItem: (id) =>
          set((state) => {
            state.items = state.items.filter((i) => i.id !== id);
          }),

        updateQuantity: (id, quantity) =>
          set((state) => {
            if (quantity <= 0) {
              state.items = state.items.filter((i) => i.id !== id);
              return;
            }
            const item = state.items.find((i) => i.id === id);
            if (item) {
              item.quantity = quantity;
            }
          }),

        clearCart: () => set({ items: [], isOpen: false }),

        toggleCart: () => set((state) => { state.isOpen = !state.isOpen; }),

        openCart: () => set((state) => { state.isOpen = true; }),

        closeCart: () => set((state) => { state.isOpen = false; }),

        validateCart: async (restaurantId: string, tableId?: string): Promise<ValidationResult> => {
          const items = useCartStore.getState().items;

          // Rule 1: Empty cart
          if (items.length === 0) {
            return {
              valid: false,
              errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
            };
          }

          try {
            const response = await fetch('/api/cart/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items, restaurantId, tableId }),
            });

            const result = await response.json();
            return {
              valid: result.valid,
              errors: result.errors ?? [],
            };
          } catch (error) {
            console.error('Cart validation error:', error);
            return {
              valid: false,
              errors: ['Erro ao validar carrinho'],
            };
          }
        },
      }))
    ),
    {
      name: 'pedi-ai-cart',
      partialize: (state) => ({ items: state.items, restaurantId: state.restaurantId }),
    }
  )
);

// ── Subscribe to mutations and persist to IndexedDB ──────────

useCartStore.subscribe(
  (state: CartStore) => state.items,
  (items: CartItem[]) => {
    persistCartToIndexedDB(items).catch(console.error);
    broadcastCartUpdate(items);
  }
);

// ── Listen for updates from other tabs ────────────────────────

/**
 * Initialize cross-tab sync. Called after store is set up.
 * In browser environment, sets up BroadcastChannel listener.
 *
 * Tests can call this manually after setting up BroadcastChannel mocks.
 */
export function initCrossTabSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanup = listenForCartUpdates(/* istanbul ignore next */ (items) => {
    // Only update if different from current state to avoid unnecessary re-renders
    const currentItems = useCartStore.getState().items;
    if (JSON.stringify(currentItems) !== JSON.stringify(items)) {
      useCartStore.setState({ items });
    }
  });

  // Cleanup on page unload
  window.addEventListener('unload', /* istanbul ignore next */ () => {
    cleanup();
    getChannelManager().close();
  });

  return cleanup;
}

// Auto-initialize cross-tab sync (browser only)
if (typeof window !== 'undefined') {
  initCrossTabSync();
}

// ── Selectors ─────────────────────────────────────────────────

export const getTotalItems = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const getTotalPrice = (state: CartState) =>
  state.items.reduce((sum, item) => {
    if (item.comboId && item.bundlePrice !== undefined) {
      // Combo item: use bundlePrice × quantity (modifiers included in bundle)
      return sum + item.bundlePrice * item.quantity;
    }
    // Regular item: unitPrice + sum(modifierPriceAdjustments) × quantity
    const modifierTotal = item.modifiers.reduce((mSum, mod) => mSum + mod.price_adjustment, 0);
    return sum + (item.unitPrice + modifierTotal) * item.quantity;
  }, 0);

export const getSubtotal = getTotalPrice;
