import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock do cache offline — necessário porque os testes de hydrate
// dependem de `getCachedMenu`. Sem este mock, a referência `mockGetCachedMenu`
// usada nos `beforeEach` abaixo ficaria indefinida.
vi.mock('@/lib/offline/cache', async () => {
  const actual = await vi.importActual<typeof import('@/lib/offline/cache')>('@/lib/offline/cache');
  return {
    ...actual,
    getCachedMenu: vi.fn(),
  };
});

import {
  useMenuStore,
  getFilteredProducts,
  getProductsByCategory,
  hydrateFromCache,
} from '@/infrastructure/persistence/menuStore';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';

import { getCachedMenu } from '@/lib/offline/cache';

const mockGetCachedMenu = vi.mocked(getCachedMenu);

// ── Test helpers ────────────────────────────────────────────────────────────

function makeProduct(
  overrides: {
    id?: string;
    categoriaId?: string;
    nome?: string;
    descricao?: string | null;
    precoCentavos?: number;
    labelsDieteticos?: string[];
    ativo?: boolean;
  } = {}
): ItemCardapio {
  return ItemCardapio.reconstruir({
    id: overrides.id ?? 'prod-1',
    categoriaId: overrides.categoriaId ?? 'cat-main',
    nome: overrides.nome ?? 'Produto',
    descricao: overrides.descricao ?? null,
    preco: Dinheiro.criar(overrides.precoCentavos ?? 1000),
    imagemUrl: null,
    tipo: TipoItemCardapio.PRODUTO,
    labelsDieteticos: (overrides.labelsDieteticos ?? []).map((l) => LabelDietetico.fromValue(l)),
    ativo: overrides.ativo ?? true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    deletedAt: null,
    version: 1,
  } as any);
}

function makeCategory(
  overrides: {
    id?: string;
    nome?: string;
    descricao?: string | null;
    ativo?: boolean;
  } = {}
): Categoria {
  return Categoria.reconstruir({
    id: overrides.id ?? 'cat-1',
    nome: overrides.nome ?? 'Categoria',
    descricao: overrides.descricao ?? null,
    imagemUrl: null,
    ordem: 0,
    ativo: overrides.ativo ?? true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    deletedAt: null,
    version: 1,
  } as any);
}

function makeModifierGroup(
  overrides: {
    id?: string;
    nome?: string;
  } = {}
): ModificadorGrupo {
  return ModificadorGrupo.reconstruir({
    id: overrides.id ?? 'mod-1',
    nome: overrides.nome ?? 'Grupo',
    required: false,
    minSelections: 0,
    maxSelections: 1,
    criadoEm: new Date(),
    valores: [],
  } as any);
}

function buildState(
  overrides: Partial<ReturnType<typeof useMenuStore.getState>> = {}
): ReturnType<typeof useMenuStore.getState> {
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

const CAT_MAIN = makeCategory({ id: 'cat-main', nome: 'Pratos Principais' });
const CAT_DESSERT = makeCategory({ id: 'cat-dessert', nome: 'Sobremesas' });

const PIZZA = makeProduct({ id: 'pizza1', nome: 'Pizza Margherita', categoriaId: 'cat-main' });
const SALAD = makeProduct({
  id: 'salad1',
  nome: 'Salada Verde',
  categoriaId: 'cat-main',
  labelsDieteticos: ['vegetariano'],
});
const CAKE = makeProduct({ id: 'cake1', nome: 'Bolo de Chocolate', categoriaId: 'cat-dessert' });
const QUINOA = makeProduct({
  id: 'quinoa1',
  nome: 'Salada de Quinoa',
  categoriaId: 'cat-main',
  labelsDieteticos: ['vegetariano', 'glutenFree'],
});

const MODIFIER_GROUP = makeModifierGroup({ id: 'mod-1', nome: 'Extras' });

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
      useMenuStore.getState().toggleDietaryFilter('vegetariano');
      expect(useMenuStore.getState().dietaryFilters).toContain('vegetariano');
    });

    it('removes a dietary filter when already present', () => {
      useMenuStore.getState().toggleDietaryFilter('vegetariano');
      useMenuStore.getState().toggleDietaryFilter('vegetariano');
      expect(useMenuStore.getState().dietaryFilters).not.toContain('vegetariano');
    });

    it('can have multiple filters', () => {
      useMenuStore.getState().toggleDietaryFilter('vegetariano');
      useMenuStore.getState().toggleDietaryFilter('glutenFree');
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
      useMenuStore.getState().toggleDietaryFilter('vegetariano');
      useMenuStore.getState().toggleDietaryFilter('glutenFree');
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
      useMenuStore.getState().toggleDietaryFilter('vegetariano');
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
        dietaryFilters: ['vegetariano', 'glutenFree'],
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('quinoa1');
    });

    it('returns empty when no product matches dietary filter', () => {
      const state = buildState({
        products: [PIZZA, CAKE],
        dietaryFilters: ['vegano'],
      });

      const filtered = getFilteredProducts(state);
      expect(filtered).toHaveLength(0);
    });

    it('product with null labelsDieteticos does not match filter', () => {
      const state = buildState({
        products: [PIZZA],
        dietaryFilters: ['vegetariano'],
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
      const CAT_VEG = makeCategory({ id: 'cat-veg', nome: 'Vegetariano' });
      const state = buildState({
        categories: [CAT_MAIN, CAT_VEG],
        products: [SALAD, QUINOA, PIZZA],
        selectedCategoryId: 'cat-main',
        dietaryFilters: ['vegetariano'],
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

    await hydrateFromCache('r-1');

    const state = useMenuStore.getState();
    expect(state.categories).toHaveLength(2);
    expect(state.products).toHaveLength(3);
    expect(state.modifierGroups).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Hydration — hydrateFromCache (S3#10: única via cache→store)
// ══════════════════════════════════════════════════════════════════════════════

describe('menuStore — hydrateFromCache', () => {
  beforeEach(() => {
    useMenuStore.getState().reset();
    mockGetCachedMenu.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false quando não há cache', async () => {
    const result = await hydrateFromCache('r-1');
    expect(result).toBe(false);
    expect(useMenuStore.getState().products).toHaveLength(0);
  });

  it('retorna true e popula o store quando cache existe', async () => {
    const cachedData = {
      categories: [CAT_MAIN],
      products: [PIZZA],
      modifiers: [],
      timestamp: Date.now(),
    };
    mockGetCachedMenu.mockResolvedValue(cachedData);

    const result = await hydrateFromCache('r-1');

    expect(result).toBe(true);
    expect(useMenuStore.getState().products).toHaveLength(1);
    expect(useMenuStore.getState().categories).toHaveLength(1);
  });

  it('carrega categories, products, e modifiers do cache', async () => {
    const cachedData = {
      categories: [CAT_MAIN, CAT_DESSERT],
      products: [PIZZA, CAKE],
      modifiers: [MODIFIER_GROUP],
      timestamp: Date.now(),
    };
    mockGetCachedMenu.mockResolvedValue(cachedData);

    await hydrateFromCache('r-1');

    const state = useMenuStore.getState();
    expect(state.categories).toHaveLength(2);
    expect(state.products).toHaveLength(2);
    expect(state.modifierGroups).toHaveLength(1);
  });
});
