import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { Categoria } from '@/domain/cardapio/entities/Categoria';
import type { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import type { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
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
  // Restaurant context
  restaurantId: string | null;

  // Menu data — tipados pelo domínio; nada de any[] aqui.
  categories: Categoria[];
  products: ItemCardapio[];
  modifierGroups: ModificadorGrupo[];

  // Filter state
  selectedCategoryId: string | null;
  dietaryFilters: DietaryLabel[];
  searchQuery: string;

  // Loading/error
  isLoading: boolean;
  error: string | null;
}

export interface MenuActions {
  // Restaurant context
  setRestaurantId: (restaurantId: string | null) => void;

  // Data setters
  setCategories: (categories: Categoria[]) => void;
  setProducts: (products: ItemCardapio[]) => void;
  setModifierGroups: (modifierGroups: ModificadorGrupo[]) => void;

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
  restaurantId: null,
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

    setRestaurantId: (restaurantId) =>
      set((state) => {
        state.restaurantId = restaurantId;
      }),

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
export function getFilteredProducts(state: MenuState): ItemCardapio[] {
  let filtered = state.products;

  // Filter by category
  if (state.selectedCategoryId !== null) {
    filtered = filtered.filter((p) => p.categoriaId === state.selectedCategoryId);
  }

  // Filter by dietary labels (AND logic)
  if (state.dietaryFilters.length > 0) {
    filtered = filtered.filter((p) => {
      const productLabels = p.labelsDieteticos ?? [];
      return state.dietaryFilters.every((label) =>
        productLabels.some((l) => l.toString() === label)
      );
    });
  }

  // Filter by search query (case-insensitive, includes)
  if (state.searchQuery.trim() !== '') {
    const query = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((p) => p.nome.toLowerCase().includes(query));
  }

  return filtered;
}

/**
 * Get products by category ID.
 */
export function getProductsByCategory(state: MenuState, categoryId: string): ItemCardapio[] {
  return state.products.filter((p) => p.categoriaId === categoryId);
}

// ── Hydration helpers ─────────────────────────────────────────

/**
 * Hydrates the store with cached data from IndexedDB.
 * Used by `useMenu` hook (see hooks/useMenu.ts) — it already calls this
 * automatically when API fetch fails or on startup offline.
 *
 * Os itens do cache vêm como `unknown[]` (Persistência nunca deve confiar no
 * conteúdo). Validamos em runtime com `validateCachedMenu()` antes de atribuir.
 *
 * S3#10: única via de cache→store. Antes havia um segundo helper
 * `useHydratedMenu` duplicando este corpo byte-a-byte — removido para
 * eliminar caminhos divergentes que poderiam popular o store de formas
 * distintas (um deles usando validateCached*, o outro bypassando).
 */
export async function hydrateFromCache(restaurantId: string): Promise<boolean> {
  const cached = await getCachedMenu(restaurantId);
  if (!cached) return false;

  useMenuStore.getState().setRestaurantId(restaurantId);
  useMenuStore.getState().setCategories(validateCachedCategorias(cached.categories));
  useMenuStore.getState().setProducts(validateCachedProdutos(cached.products));
  useMenuStore.getState().setModifierGroups(validateCachedModifiers(cached.modifiers));
  return true;
}

// ── Runtime cache validation ──────────────────────────────────

/**
 * Validadores de runtime para o que vier do IndexedDB. Persistência não-typed
 * é uma fronteira de confiança — não assumimos shape do conteúdo.
 *
 * Mantemos leniência: aceitamos o item mesmo com campos opcionais faltando,
 * apenas exigimos os identificadores e campos mínimos.
 */
function validateCachedCategorias(raw: unknown[]): Categoria[] {
  return raw.filter((c): c is Categoria => {
    return (
      typeof c === 'object' &&
      c !== null &&
      typeof (c as { id?: unknown }).id === 'string' &&
      typeof (c as { nome?: unknown }).nome === 'string'
    );
  });
}

function validateCachedProdutos(raw: unknown[]): ItemCardapio[] {
  return raw.filter((p): p is ItemCardapio => {
    return (
      typeof p === 'object' &&
      p !== null &&
      typeof (p as { id?: unknown }).id === 'string' &&
      typeof (p as { nome?: unknown }).nome === 'string'
    );
  });
}

function validateCachedModifiers(raw: unknown[]): ModificadorGrupo[] {
  return raw.filter((m): m is ModificadorGrupo => {
    return typeof m === 'object' && m !== null && typeof (m as { id?: unknown }).id === 'string';
  });
}
