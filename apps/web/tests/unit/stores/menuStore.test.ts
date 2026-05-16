import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useMenuStore, getFilteredProducts, getProductsByCategory, hydrateFromCache, useHydratedMenu } from '@/infrastructure/persistence/menuStore';
import type { categories, products, modifier_groups } from '@/lib/supabase/types';

// ── Mock getCachedMenu ───────────────────────────────────────────────────────
const mockGetCachedMenu = vi.fn();

vi.mock('@/lib/offline/cache', () => ({
  getCachedMenu: () => mockGetCachedMenu(),
}));

// ── Test helpers ────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<products> = {}): products {
  const now = new Date().toISOString();
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
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<categories> = {}): categories {
  return {
    id: 'cat-1',
    name: 'Categoria',
    description: null,
    image_url: null,
    sort_order: 0,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeModifierGroup(overrides: Partial<modifier_groups> = {}): modifier_groups {
  return {
    id: 'mod-1',
    name: 'Grupo',
    description: null,
    min_selections: 0,
    max_selections: null,
    required: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function buildState(overrides: Partial<ReturnType<typeof useMenuStore.getState>> = {}): ReturnType<typeof useMenuStore.getState> {
  return {
    categories: [],
    products: [],
    modifierGroups: [],
    selectedCategoryId: null,
    dietaryFilters: [],
    searchQuery: '',
    isLoading: false,
    error: null,
    setCategories: vi.fn(),
    setProducts: vi.fn(),
    setModifierGroups: vi.fn(),
    setSelectedCategory: vi.fn(),
    toggleDietaryFilter: vi.fn(),
    setSearchQuery: vi.fn(),
    clearFilters: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

// ── Test Data ───────────────────────────────────────────────────────────────

const CAT_MAIN = makeCategory({ id: 'cat-main', name: 'Pratos Principais' });
const CAT_DESSERT = makeCategory({ id: 'cat-dessert', name: 'Sobremesas' });

const PIZZA = makeProduct({ id: 'pizza1', name: 'Pizza Margherita', category_id: 'cat-main' });
const SALAD = makeProduct({ id: 'salad1', name: 'Salada Verde', category_id: 'cat-main', dietary_labels: ['vegetarian'] });
const CAKE = makeProduct({ id: 'cake1', name: 'Bolo de Chocolate', category_id: 'cat-dessert' });
const QUINOA = makeProduct({
  id: 'quinoa1',
  name: 'Salada de Quinoa',
  category_id: 'cat-main',
  dietary_labels: ['vegetarian', 'gluten_free'],
});

const MODIFIER_GROUP = makeModifierGroup({ id: 'mod-1', name: 'Extras' });

// ══════════════════════════════════════════════════════════════════════════════
// Store Actions — real store tests
// ══════════════════════════════════════════════════════════════════════════════

describe('menuStore — actions (real store)', () => {
  beforeEach(() => {
    useMenuStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setCategories', () => {
    it('sets categories array', () => {
      useMenuStore.getState().setCategories([CAT_MAIN, CAT_DESSERT]);
      expect(useMenuStore.getState().categories).toHaveLength(2);
      expect(useMenuStore.getState().categories[0].id).toBe('cat-main');
    });

    it('replaces existing categories', () => {
      useMenuStore.getState().setCategories([CAT_MAIN]);
      useMenuStore.getState().setCategories([CAT_DESSERT]);
      expect(useMenuStore.getState().categories).toHaveLength(1);
      expect(useMenuStore.getState().categories[0].id).toBe('cat-dessert');
    });
  });

  describe('setProducts', () => {
    it('sets products array', () => {
      useMenuStore.getState().setProducts([PIZZA, SALAD]);
      expect(useMenuStore.getState().products).toHaveLength(2);
    });

    it('replaces existing products', () => {
      useMenuStore.getState().setProducts([PIZZA]);
      useMenuStore.getState().setProducts([CAKE]);
      expect(useMenuStore.getState().products).toHaveLength(1);
      expect(useMenuStore.getState().products[0].id).toBe('cake1');
    });
  });

  describe('setModifierGroups', () => {
    it('sets modifier groups array', () => {
      useMenuStore.getState().setModifierGroups([MODIFIER_GROUP]);
      expect(useMenuStore.getState().modifierGroups).toHaveLength(1);
    });
  });

  describe('setSelectedCategory', () => {
    it('sets selected category id', () => {
      useMenuStore.getState().setSelectedCategory('cat-main');
      expect(useMenuStore.getState().selectedCategoryId).toBe('cat-main');
    });

    it('can set null to clear category', () => {
      useMenuStore.getState().setSelectedCategory('cat-main');
      useMenuStore.getState().setSelectedCategory(null);
      expect(useMenuStore.getState().selectedCategoryId).toBeNull();
    });
  });

  describe('toggleDietaryFilter', () => {
    it('adds a dietary filter when not present', () => {
      useMenuStore.getState().toggleDietaryFilter('vegetarian');
      expect(useMenuStore.getState().dietaryFilters).toContain('vegetarian');
    });

    it('removes a dietary filter when already present', () => {
      useMenuStore.getState().toggleDietaryFilter('vegetarian');
      useMenuStore.getState().toggleDietaryFilter('vegetarian');
      expect(useMenuStore.getState().dietaryFilters).not.toContain('vegetarian');
    });

    it('can have multiple filters', () => {
      useMenuStore.getState().toggleDietaryFilter('vegetarian');
      useMenuStore.getState().toggleDietaryFilter('gluten_free');
      expect(useMenuStore.getState().dietaryFilters).toHaveLength(2);
    });
  });

  describe('setSearchQuery', () => {
    it('sets search query', () => {
      useMenuStore.getState().setSearchQuery('pizza');
      expect(useMenuStore.getState().searchQuery).toBe('pizza');
    });

    it('overwrites previous query', () => {
      useMenuStore.getState().setSearchQuery('pizza');
      useMenuStore.getState().setSearchQuery('bolo');
      expect(useMenuStore.getState().searchQuery).toBe('bolo');
    });
  });

  describe('clearFilters', () => {
    it('clears selectedCategoryId', () => {
      useMenuStore.getState().setSelectedCategory('cat-main');
      useMenuStore.getState().clearFilters();
      expect(useMenuStore.getState().selectedCategoryId).toBeNull();
    });

    it('clears dietaryFilters', () => {
      useMenuStore.getState().toggleDietaryFilter('vegetarian');
      useMenuStore.getState().toggleDietaryFilter('gluten_free');
      useMenuStore.getState().clearFilters();
      expect(useMenuStore.getState().dietaryFilters).toEqual([]);
    });

    it('clears searchQuery', () => {
      useMenuStore.getState().setSearchQuery('pizza');
      useMenuStore.getState().clearFilters();
      expect(useMenuStore.getState().searchQuery).toBe('');
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useMenuStore.getState().setCategories([CAT_MAIN]);
      useMenuStore.getState().setProducts([PIZZA]);
      useMenuStore.getState().setModifierGroups([MODIFIER_GROUP]);
      useMenuStore.getState().setSelectedCategory('cat-main');
      useMenuStore.getState().toggleDietaryFilter('vegetarian');
      useMenuStore.getState().setSearchQuery('pizza');

      useMenuStore.getState().reset();

      const state = useMenuStore.getState();
      expect(state.categories).toEqual([]);
      expect(state.products).toEqual([]);
      expect(state.modifierGroups).toEqual([]);
      expect(state.selectedCategoryId).toBeNull();
      expect(state.dietaryFilters).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Selectors — getFilteredProducts (using isolated state objects)
// ══════════════════════════════════════════════════════════════════════════════

describe('menuStore — getFilteredProducts selector', () => {
  describe('category filter', () => {
    it('returns only products in the selected category', () => {
      const state = buildState({
        products: [PIZZA, CAKE],
        selectedCategoryId: 'cat-main',
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('pizza1');
    });

    it('returns all products when no category is selected', () => {
      const state = buildState({
        products: [PIZZA, CAKE],
        selectedCategoryId: null,
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('dietary filter — AND logic', () => {
    it('returns only products with ALL selected labels', () => {
      const state = buildState({
        products: [SALAD, QUINOA, PIZZA],
        dietaryFilters: ['vegetarian', 'gluten_free'],
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('quinoa1');
    });

    it('returns empty when no product matches dietary filter', () => {
      const state = buildState({
        products: [PIZZA, CAKE],
        dietaryFilters: ['vegan'],
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(0);
    });

    it('product with null dietary_labels does not match filter', () => {
      const state = buildState({
        products: [PIZZA],
        dietaryFilters: ['vegetarian'],
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('search — case insensitive partial match', () => {
    it('matches partial name', () => {
      const state = buildState({
        products: [PIZZA, CAKE, SALAD],
        searchQuery: 'Sal',
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('salad1');
    });

    it('is case insensitive', () => {
      const state = buildState({
        products: [PIZZA, CAKE],
        searchQuery: 'PIZZA',
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(1);
    });

    it('trims whitespace from query', () => {
      const state = buildState({
        products: [PIZZA],
        searchQuery: '  pizza  ',
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(1);
    });

    it('empty query returns all products', () => {
      const state = buildState({
        products: [PIZZA, CAKE],
        searchQuery: '',
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('combined filters', () => {
    it('applies category + dietary + search together', () => {
      const CAT_VEG = makeCategory({ id: 'cat-veg', name: 'Vegetariano' });
      const state = buildState({
        categories: [CAT_MAIN, CAT_VEG],
        products: [SALAD, QUINOA, PIZZA],
        selectedCategoryId: 'cat-main',
        dietaryFilters: ['vegetarian'],
        searchQuery: 'Verde', // uniquely matches SALAD but not QUINOA
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('salad1');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Selectors — getProductsByCategory
// ══════════════════════════════════════════════════════════════════════════════

describe('menuStore — getProductsByCategory selector', () => {
  it('returns products for a given category id', () => {
    const state = buildState({
      products: [PIZZA, SALAD, CAKE],
    });

    const result = getProductsByCategory(state, 'cat-main');
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toContain('pizza1');
    expect(result.map((p) => p.id)).toContain('salad1');
  });

  it('returns empty array when no products in category', () => {
    const state = buildState({
      products: [PIZZA, SALAD, CAKE],
    });

    const result = getProductsByCategory(state, 'cat-nonexistent');
    expect(result).toHaveLength(0);
  });

  it('returns empty when products array is empty', () => {
    const state = buildState({
      products: [],
    });

    const result = getProductsByCategory(state, 'cat-main');
    expect(result).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Hydration — hydrateFromCache
// ══════════════════════════════════════════════════════════════════════════════

describe('menuStore — hydrateFromCache', () => {
  beforeEach(() => {
    useMenuStore.getState().reset();
    mockGetCachedMenu.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when cache is empty', async () => {
    mockGetCachedMenu.mockResolvedValue(null);

    await hydrateFromCache();

    // State should remain empty
    expect(useMenuStore.getState().categories).toEqual([]);
    expect(useMenuStore.getState().products).toEqual([]);
  });

  it('loads cached data into store when cache exists', async () => {
    const cachedData = {
      categories: [CAT_MAIN, CAT_DESSERT],
      products: [PIZZA, SALAD, CAKE],
      modifiers: [MODIFIER_GROUP],
      timestamp: Date.now(),
    };
    mockGetCachedMenu.mockResolvedValue(cachedData);

    await hydrateFromCache();

    const state = useMenuStore.getState();
    expect(state.categories).toHaveLength(2);
    expect(state.products).toHaveLength(3);
    expect(state.modifierGroups).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Hydration — useHydratedMenu
// ══════════════════════════════════════════════════════════════════════════════

describe('menuStore — useHydratedMenu', () => {
  beforeEach(() => {
    useMenuStore.getState().reset();
    mockGetCachedMenu.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success:false when no cache and API fails', async () => {
    const result = await useHydratedMenu();
    expect(result).toEqual({ success: false, fromCache: false });
  });

  it('returns success:true with fromCache:true when cache is available after API failure', async () => {
    const cachedData = {
      categories: [CAT_MAIN],
      products: [PIZZA],
      modifiers: [],
      timestamp: Date.now(),
    };
    mockGetCachedMenu.mockResolvedValue(cachedData);

    const result = await useHydratedMenu();

    expect(result).toEqual({ success: true, fromCache: true });
    expect(useMenuStore.getState().products).toHaveLength(1);
  });

  it('loads cached categories, products, and modifiers', async () => {
    const cachedData = {
      categories: [CAT_MAIN, CAT_DESSERT],
      products: [PIZZA, CAKE],
      modifiers: [MODIFIER_GROUP],
      timestamp: Date.now(),
    };
    mockGetCachedMenu.mockResolvedValue(cachedData);

    await useHydratedMenu();

    const state = useMenuStore.getState();
    expect(state.categories).toHaveLength(2);
    expect(state.products).toHaveLength(2);
    expect(state.modifierGroups).toHaveLength(1);
  });
});