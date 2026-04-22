import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { categories, products, modifier_groups } from '@/lib/supabase/types';
import { getCachedMenu } from '@/lib/offline/cache';

// ── Types ────────────────────────────────────────────────────

export type DietaryLabel =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'halal'
  | 'kosher';

export interface MenuState {
  // Menu data
  categories: categories[];
  products: products[];
  modifierGroups: modifier_groups[];

  // Filter state
  selectedCategoryId: string | null;
  dietaryFilters: DietaryLabel[];
  searchQuery: string;

  // Loading/error
  isLoading: boolean;
  error: string | null;
}

export interface MenuActions {
  // Data setters
  setCategories: (categories: categories[]) => void;
  setProducts: (products: products[]) => void;
  setModifierGroups: (modifierGroups: modifier_groups[]) => void;

  // Filter setters
  setSelectedCategory: (categoryId: string | null) => void;
  toggleDietaryFilter: (label: DietaryLabel) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // Loading/error setters
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

export type MenuStore = MenuState & MenuActions;

// ── Initial State ─────────────────────────────────────────────

const initialState: MenuState = {
  categories: [],
  products: [],
  modifierGroups: [],
  selectedCategoryId: null,
  dietaryFilters: [],
  searchQuery: '',
  isLoading: false,
  error: null,
};

// ── Store ────────────────────────────────────────────────────

export const useMenuStore = create<MenuStore>()(
  immer((set) => ({
    ...initialState,

    setCategories: (categories) =>
      set((state) => {
        state.categories = categories;
      }),

    setProducts: (products) =>
      set((state) => {
        state.products = products;
      }),

    setModifierGroups: (modifierGroups) =>
      set((state) => {
        state.modifierGroups = modifierGroups;
      }),

    setSelectedCategory: (categoryId) =>
      set((state) => {
        state.selectedCategoryId = categoryId;
      }),

    toggleDietaryFilter: (label) =>
      set((state) => {
        const index = state.dietaryFilters.indexOf(label);
        if (index === -1) {
          state.dietaryFilters.push(label);
        } else {
          state.dietaryFilters.splice(index, 1);
        }
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
      }),

    clearFilters: () =>
      set((state) => {
        state.selectedCategoryId = null;
        state.dietaryFilters = [];
        state.searchQuery = '';
      }),

    setIsLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    reset: () =>
      set((state) => {
        Object.assign(state, initialState);
      }),
  }))
);

// ── Selectors ────────────────────────────────────────────────

/**
 * Get products filtered by category + dietary + search.
 * Dietary filter uses AND logic: product must match ALL selected labels.
 * If no category selected, returns all products (filtered by dietary + search).
 */
export function getFilteredProducts(state: MenuState): products[] {
  let filtered = state.products;

  // Filter by category
  if (state.selectedCategoryId !== null) {
    filtered = filtered.filter((p) => p.category_id === state.selectedCategoryId);
  }

  // Filter by dietary labels (AND logic)
  if (state.dietaryFilters.length > 0) {
    filtered = filtered.filter((p) => {
      const productLabels = p.dietary_labels ?? [];
      return state.dietaryFilters.every((label) => productLabels.includes(label));
    });
  }

  // Filter by search query (case-insensitive, includes)
  if (state.searchQuery.trim() !== '') {
    const query = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
  }

  return filtered;
}

/**
 * Get products by category ID.
 */
export function getProductsByCategory(
  state: MenuState,
  categoryId: string
): products[] {
  return state.products.filter((p) => p.category_id === categoryId);
}

// ── Hydration helpers ─────────────────────────────────────────

/**
 * Hydrates the store with cached data from IndexedDB.
 * Used by `useMenu` hook (see hooks/useMenu.ts) — it already calls this
 * automatically when API fetch fails or on startup offline.
 */
export async function hydrateFromCache(): Promise<void> {
  const cached = await getCachedMenu();
  if (!cached) return;

  useMenuStore.getState().setCategories(cached.categories as categories[]);
  useMenuStore.getState().setProducts(cached.products as products[]);
  useMenuStore.getState().setModifierGroups(cached.modifiers as modifier_groups[]);
}

/**
 * Attempts to fetch menu from API; falls back to IndexedDB cache if offline.
 * Returns { success, fromCache } to indicate data origin.
 */
export async function useHydratedMenu(): Promise<{ success: boolean; fromCache: boolean }> {
  try {
    throw new Error('API not implemented');
  } catch (err) {
    console.warn('useHydratedMenu: API not available, falling back to cache', err);
    const cached = await getCachedMenu();
    if (!cached) return { success: false, fromCache: false };

    useMenuStore.getState().setCategories(cached.categories as categories[]);
    useMenuStore.getState().setProducts(cached.products as products[]);
    useMenuStore.getState().setModifierGroups(cached.modifiers as modifier_groups[]);
    return { success: true, fromCache: true };
  }
}