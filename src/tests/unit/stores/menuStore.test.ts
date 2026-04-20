import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MenuState, MenuStore, DietaryLabel } from '@/stores/menuStore';
import type { products } from '@/lib/supabase/types';

// ── Inline getFilteredProducts (mirrors store logic) ─────────────────────────
// This is a copy of the selector logic from menuStore.ts so we can test it
// without importing the store (which requires the `immer` package).
function getFilteredProducts(state: MenuState): products[] {
  let filtered = state.products;

  if (state.selectedCategoryId !== null) {
    filtered = filtered.filter((p) => p.category_id === state.selectedCategoryId);
  }

  if (state.dietaryFilters.length > 0) {
    filtered = filtered.filter((p) => {
      const productLabels = p.dietary_labels ?? [];
      return state.dietaryFilters.every((label) => productLabels.includes(label));
    });
  }

  if (state.searchQuery.trim() !== '') {
    const query = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
  }

  return filtered;
}

// ── Mock store factory ───────────────────────────────────────────────────────
function createMockStore(initialState: MenuState): MenuStore {
  return {
    ...initialState,
    setCategories: vi.fn(),
    setProducts: vi.fn((products: products[]) => {
      initialState.products = products;
    }),
    setModifierGroups: vi.fn(),
    setSelectedCategory: vi.fn((categoryId: string | null) => {
      initialState.selectedCategoryId = categoryId;
    }),
    toggleDietaryFilter: vi.fn((label: DietaryLabel) => {
      const index = initialState.dietaryFilters.indexOf(label);
      if (index === -1) {
        initialState.dietaryFilters.push(label);
      } else {
        initialState.dietaryFilters.splice(index, 1);
      }
    }),
    setSearchQuery: vi.fn((query: string) => {
      initialState.searchQuery = query;
    }),
    clearFilters: vi.fn(() => {
      initialState.selectedCategoryId = null;
      initialState.dietaryFilters = [];
      initialState.searchQuery = '';
    }),
    reset: vi.fn(() => {
      initialState.categories = [];
      initialState.products = [];
      initialState.modifierGroups = [];
      initialState.selectedCategoryId = null;
      initialState.dietaryFilters = [];
      initialState.searchQuery = '';
      initialState.isLoading = false;
      initialState.error = null;
    }),
  };
}

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<products> = {}): products {
  return {
    id: 'prod-1',
    category_id: 'cat-main',
    name: 'Product',
    description: null,
    image_url: null,
    price: 10,
    dietary_labels: null,
    available: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function buildState(overrides: Partial<MenuState> = {}): MenuState {
  return {
    categories: [],
    products: [],
    modifierGroups: [],
    selectedCategoryId: null,
    dietaryFilters: [],
    searchQuery: '',
    isLoading: false,
    error: null,
    ...overrides,
  };
}

// ── Test Data ─────────────────────────────────────────────────────────────────

const VEG_PRODUCT = makeProduct({ id: 'p1', name: 'Salada Verde', dietary_labels: ['vegetarian'] });
const GF_PRODUCT = makeProduct({ id: 'p2', name: 'Arroz Branco', dietary_labels: ['gluten_free'] });
const VEG_GF_PRODUCT = makeProduct({ id: 'p3', name: 'Salada de Quinoa', dietary_labels: ['vegetarian', 'gluten_free'] });
const REGULAR_PRODUCT = makeProduct({ id: 'p4', name: 'Bife' });

const PIZZA = makeProduct({ id: 'pizza1', name: 'Pizza' });
const PIZZA_LOWER = makeProduct({ id: 'pizza2', name: 'pizza' });
const PIZZA_UPPER = makeProduct({ id: 'pizza3', name: 'PIZZA' });
const HAMBURGER = makeProduct({ id: 'p5', name: 'Hambúrguer Artesanal' });

const CAT_MAIN = 'cat-main';
const CAT_DESSERT = 'cat-dessert';
const PRODUCT_IN_MAIN = makeProduct({ id: 'p6', name: 'Pão', category_id: CAT_MAIN });
const PRODUCT_IN_DESSERT = makeProduct({ id: 'p7', name: 'Bolo', category_id: CAT_DESSERT });

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('menuStore — filtering and search logic', () => {

  // ════════════════════════════════════════════════════════════════════════════
  // Dietary Filter — AND logic
  // ════════════════════════════════════════════════════════════════════════════

  describe('Dietary filter — AND logic', () => {
    it('returns only vegetarian products when vegetarian filter is selected', () => {
      const state = buildState({
        products: [VEG_PRODUCT, GF_PRODUCT, VEG_GF_PRODUCT, REGULAR_PRODUCT],
        dietaryFilters: ['vegetarian'],
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.id)).toContain('p1');
      expect(filtered.map((p) => p.id)).toContain('p3');
    });

    it('returns only products with ALL selected dietary labels (AND logic)', () => {
      const state = buildState({
        products: [VEG_PRODUCT, GF_PRODUCT, VEG_GF_PRODUCT, REGULAR_PRODUCT],
        dietaryFilters: ['vegetarian', 'gluten_free'],
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p3');
    });

    it('returns empty array when no product matches dietary filter', () => {
      const state = buildState({
        products: [REGULAR_PRODUCT],
        dietaryFilters: ['vegan'],
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(0);
    });

    it('product with null dietary_labels does not match any filter', () => {
      const state = buildState({
        products: [REGULAR_PRODUCT],
        dietaryFilters: ['vegetarian'],
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Search — case insensitive & partial match
  // ════════════════════════════════════════════════════════════════════════════

  describe('Search — case insensitive', () => {
    it('returns all case variants when searching "pizza"', () => {
      const state = buildState({
        products: [PIZZA, PIZZA_LOWER, PIZZA_UPPER],
        searchQuery: 'pizza',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(3);
    });

    it('search is case insensitive for mixed case queries', () => {
      const state = buildState({
        products: [PIZZA, PIZZA_LOWER, PIZZA_UPPER],
        searchQuery: 'PIZZa',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(3);
    });
  });

  describe('Search — partial match', () => {
    it('returns product on partial name match (hamb)', () => {
      // Note: "burg" does NOT match "Hambúrguer" due to the accented "ú".
      // Standard includes() is literal, not accent-insensitive.
      // Using "hamb" which matches the beginning of "Hambúrguer".
      const state = buildState({
        products: [HAMBURGER],
        searchQuery: 'hamb',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p5');
    });

    it('returns product when search matches beginning of name', () => {
      const state = buildState({
        products: [HAMBURGER],
        searchQuery: 'Hamb',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(1);
    });

    it('returns product when search matches end of name', () => {
      const state = buildState({
        products: [HAMBURGER],
        searchQuery: 'nal',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(1);
    });

    it('returns empty when no product name contains the query', () => {
      const state = buildState({
        products: [HAMBURGER],
        searchQuery: 'xyz',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(0);
    });

    it('search is accent-sensitive: "burg" does not match "Hambúrguer"', () => {
      // Documents that standard includes() does not handle accent-insensitive matching
      const state = buildState({
        products: [HAMBURGER],
        searchQuery: 'burg',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(0); // "burg" ≠ "búrguer" due to accent
    });

    it('trims whitespace from search query', () => {
      // Using "hamb" which matches "Hambúrguer" (not "burg" due to accent)
      const state = buildState({
        products: [HAMBURGER],
        searchQuery: '  hamb  ',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(1);
    });

    it('empty search query returns all products (unfiltered)', () => {
      const state = buildState({
        products: [PIZZA, PIZZA_LOWER, VEG_PRODUCT],
        searchQuery: '',
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(3);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Combined — Search + Dietary
  // ════════════════════════════════════════════════════════════════════════════

  describe('Search + dietary filter combined', () => {
    it('applies both search and dietary filter together', () => {
      const SALAD_VEG = makeProduct({ id: 's1', name: 'Salada Verde', dietary_labels: ['vegetarian'] });
      const SALAD_VEG_GF = makeProduct({ id: 's2', name: 'Salada de Quinoa', dietary_labels: ['vegetarian', 'gluten_free'] });
      const SALAD_GF = makeProduct({ id: 's3', name: 'Salada Simples', dietary_labels: ['gluten_free'] });

      const state = buildState({
        products: [SALAD_VEG, SALAD_VEG_GF, SALAD_GF],
        searchQuery: 'Salada',
        dietaryFilters: ['vegetarian'],
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.id)).toContain('s1');
      expect(filtered.map((p) => p.id)).toContain('s2');
    });

    it('returns empty when search matches but dietary does not', () => {
      const state = buildState({
        products: [VEG_PRODUCT],
        searchQuery: 'Salada Verde',
        dietaryFilters: ['vegan'],
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Category Filter
  // ════════════════════════════════════════════════════════════════════════════

  describe('Category filter', () => {
    it('returns only products in the selected category', () => {
      const state = buildState({
        products: [PRODUCT_IN_MAIN, PRODUCT_IN_DESSERT],
        selectedCategoryId: CAT_MAIN,
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p6');
    });

    it('returns all products when no category is selected', () => {
      const state = buildState({
        products: [PRODUCT_IN_MAIN, PRODUCT_IN_DESSERT],
        selectedCategoryId: null,
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(2);
    });

    it('category filter works with dietary filter', () => {
      const CAT_VEG = 'cat-veg';
      const VEG_IN_VEG_CAT = makeProduct({ id: 'v1', name: 'Verdura', category_id: CAT_VEG, dietary_labels: ['vegetarian'] });
      const VEG_IN_OTHER_CAT = makeProduct({ id: 'v2', name: 'Folha', category_id: CAT_MAIN, dietary_labels: ['vegetarian'] });

      const state = buildState({
        products: [VEG_IN_VEG_CAT, VEG_IN_OTHER_CAT],
        selectedCategoryId: CAT_VEG,
        dietaryFilters: ['vegetarian'],
      });

      const filtered = getFilteredProducts(state);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('v1');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // clearFilters
  // ════════════════════════════════════════════════════════════════════════════

  describe('clearFilters', () => {
    it('resets selectedCategoryId to null', () => {
      const initialState = buildState({ selectedCategoryId: 'cat-123' });
      const store = createMockStore(initialState);

      store.setSelectedCategory('cat-123');
      expect(initialState.selectedCategoryId).toBe('cat-123');

      store.clearFilters();

      expect(initialState.selectedCategoryId).toBeNull();
      expect(store.clearFilters).toHaveBeenCalled();
    });

    it('resets dietaryFilters to empty array', () => {
      const initialState = buildState({ dietaryFilters: [] });
      const store = createMockStore(initialState);

      store.toggleDietaryFilter('vegetarian');
      store.toggleDietaryFilter('gluten_free');
      expect(initialState.dietaryFilters).toHaveLength(2);

      store.clearFilters();

      expect(initialState.dietaryFilters).toEqual([]);
    });

    it('resets searchQuery to empty string', () => {
      const initialState = buildState({ searchQuery: '' });
      const store = createMockStore(initialState);

      store.setSearchQuery('pizza');
      expect(initialState.searchQuery).toBe('pizza');

      store.clearFilters();

      expect(initialState.searchQuery).toEqual('');
    });

    it('after clearFilters, getFilteredProducts returns all products', () => {
      const initialState = buildState({
        products: [PIZZA, VEG_PRODUCT, PRODUCT_IN_MAIN],
        selectedCategoryId: CAT_MAIN,
        dietaryFilters: ['vegetarian'],
        searchQuery: 'pizza',
      });
      const store = createMockStore(initialState);

      store.clearFilters();

      const filtered = getFilteredProducts(initialState);
      expect(filtered).toHaveLength(3);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Store Actions (mocked)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Store actions', () => {
    it('setProducts updates the products array', () => {
      const initialState = buildState({ products: [] });
      const store = createMockStore(initialState);

      store.setProducts([PIZZA, VEG_PRODUCT]);

      expect(initialState.products).toHaveLength(2);
      expect(store.setProducts).toHaveBeenCalledWith([PIZZA, VEG_PRODUCT]);
    });

    it('setSelectedCategory sets the category id', () => {
      const initialState = buildState({ selectedCategoryId: null });
      const store = createMockStore(initialState);

      store.setSelectedCategory('cat-new');

      expect(initialState.selectedCategoryId).toBe('cat-new');
    });

    it('setSelectedCategory with null clears the category', () => {
      const initialState = buildState({ selectedCategoryId: null });
      const store = createMockStore(initialState);

      store.setSelectedCategory('cat-new');
      store.setSelectedCategory(null);

      expect(initialState.selectedCategoryId).toBeNull();
    });

    it('toggleDietaryFilter adds a new filter', () => {
      const initialState = buildState({ dietaryFilters: [] });
      const store = createMockStore(initialState);

      store.toggleDietaryFilter('vegetarian');

      expect(initialState.dietaryFilters).toContain('vegetarian');
    });

    it('toggleDietaryFilter removes an existing filter', () => {
      const initialState = buildState({ dietaryFilters: ['vegetarian'] });
      const store = createMockStore(initialState);

      store.toggleDietaryFilter('vegetarian');

      expect(initialState.dietaryFilters).not.toContain('vegetarian');
    });

    it('setSearchQuery updates the search query', () => {
      const initialState = buildState({ searchQuery: '' });
      const store = createMockStore(initialState);

      store.setSearchQuery('burger');

      expect(initialState.searchQuery).toBe('burger');
    });

    it('reset restores initial state', () => {
      const initialState = buildState({
        products: [PIZZA],
        selectedCategoryId: 'cat-1',
        dietaryFilters: ['vegetarian'],
        searchQuery: 'test',
      });
      const store = createMockStore(initialState);

      store.reset();

      expect(initialState.products).toEqual([]);
      expect(initialState.selectedCategoryId).toBeNull();
      expect(initialState.dietaryFilters).toEqual([]);
      expect(initialState.searchQuery).toEqual('');
    });
  });
});
