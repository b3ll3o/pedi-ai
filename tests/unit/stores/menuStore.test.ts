import { describe, it, expect } from 'vitest'
import { getFilteredProducts, getProductsByCategory, type MenuState } from '@/stores/menuStore'

describe('menuStore selectors', () => {
  const createMockMenuState = (overrides: Partial<MenuState> = {}): MenuState => ({
    categories: [],
    products: [],
    modifierGroups: [],
    selectedCategoryId: null,
    dietaryFilters: [],
    searchQuery: '',
    isLoading: false,
    error: null,
    ...overrides,
  })

  const mockProducts = [
    { id: 'p1', name: 'Pizza', category_id: 'cat1', dietary_labels: ['vegetarian'], price: 30 } as any,
    { id: 'p2', name: 'Hambúrguer', category_id: 'cat1', dietary_labels: [], price: 25 } as any,
    { id: 'p3', name: 'Salada', category_id: 'cat2', dietary_labels: ['vegan', 'gluten_free'], price: 20 } as any,
    { id: 'p4', name: 'Suco de Laranja', category_id: 'cat3', dietary_labels: ['vegan'], price: 10 } as any,
  ]

  describe('getFilteredProducts', () => {
    it('deve retornar todos os produtos se nenhum filtro aplicado', () => {
      const state = createMockMenuState({ products: mockProducts })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(4)
    })

    it('deve filtrar por categoria', () => {
      const state = createMockMenuState({
        products: mockProducts,
        selectedCategoryId: 'cat1',
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(2)
      expect(result.map(p => p.id)).toEqual(['p1', 'p2'])
    })

    it('deve filtrar por dietary labels (AND logic)', () => {
      const state = createMockMenuState({
        products: mockProducts,
        dietaryFilters: ['vegan'],
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(2)
      expect(result.map(p => p.id)).toEqual(['p3', 'p4'])
    })

    it('deve filtrar por múltiplos dietary labels (todos devem匹配的)', () => {
      const state = createMockMenuState({
        products: mockProducts,
        dietaryFilters: ['vegan', 'gluten_free'],
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p3')
    })

    it('deve filtrar por busca (case-insensitive)', () => {
      const state = createMockMenuState({
        products: mockProducts,
        searchQuery: 'PIZZA',
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })

    it('deve filtrar por busca parcial', () => {
      const state = createMockMenuState({
        products: mockProducts,
        searchQuery: 'Laranja', // Suco de Laranja
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p4')
    })

    it('deve combinar filtros de categoria + dietary + busca', () => {
      const state = createMockMenuState({
        products: mockProducts,
        selectedCategoryId: 'cat1',
        dietaryFilters: ['vegetarian'],
        searchQuery: 'pizza',
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })

    it('deve retornar array vazio se nenhum produto corresponde', () => {
      const state = createMockMenuState({
        products: mockProducts,
        dietaryFilters: ['kosher'],
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(0)
    })

    it('deve ignorar busca vazia', () => {
      const state = createMockMenuState({
        products: mockProducts,
        searchQuery: '   ',
      })

      const result = getFilteredProducts(state)

      expect(result).toHaveLength(4)
    })
  })

  describe('getProductsByCategory', () => {
    it('deve retornar produtos da categoria', () => {
      const state = createMockMenuState({ products: mockProducts })

      const result = getProductsByCategory(state, 'cat1')

      expect(result).toHaveLength(2)
      expect(result.map(p => p.id)).toEqual(['p1', 'p2'])
    })

    it('deve retornar array vazio se categoria não existe', () => {
      const state = createMockMenuState({ products: mockProducts })

      const result = getProductsByCategory(state, 'cat99')

      expect(result).toHaveLength(0)
    })
  })
})
