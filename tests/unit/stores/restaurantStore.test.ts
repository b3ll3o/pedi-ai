import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRestaurantStore, selectTemRestauranteSelecionado } from '@/stores/restaurantStore'

vi.mock('@/infrastructure/persistence/database', () => ({
  db: {},
}))

vi.mock('@/infrastructure/persistence/admin/RestauranteRepository', () => ({
  RestauranteRepository: vi.fn(),
}))

vi.mock('@/infrastructure/persistence/admin/UsuarioRestauranteRepository', () => ({
  UsuarioRestauranteRepository: vi.fn(),
}))

vi.mock('@/application/admin/services/ListarRestaurantesDoOwnerUseCase', () => ({
  ListarRestaurantesDoOwnerUseCase: vi.fn(),
}))

describe('restaurantStore', () => {
  beforeEach(() => {
    useRestaurantStore.setState({
      restauranteSelecionado: null,
      restaurantesAcessiveis: [],
      isLoading: false,
      error: null,
    })
  })

  describe('initial state', () => {
    it('deve ter estado inicial correto', () => {
      const state = useRestaurantStore.getState()

      expect(state.restauranteSelecionado).toBeNull()
      expect(state.restaurantesAcessiveis).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setRestaurante', () => {
    it('deve definir restaurante selecionado', () => {
      const mockRestaurante = {
        id: 'rest-1',
        nome: 'Restaurante Teste',
        cnpj: '12345678900000',
        endereco: 'Rua Teste',
        telefone: '1199999999',
        logoUrl: null,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      }

      useRestaurantStore.getState().setRestaurante(mockRestaurante as any)

      const state = useRestaurantStore.getState()
      expect(state.restauranteSelecionado).toEqual(mockRestaurante)
      expect(state.error).toBeNull()
    })

    it('deve limpar erro ao definir restaurante', () => {
      useRestaurantStore.setState({ error: 'Erro anterior' })

      const mockRestaurante = {
        id: 'rest-1',
        nome: 'Restaurante Teste',
        cnpj: '12345678900000',
        endereco: 'Rua Teste',
        telefone: '1199999999',
        logoUrl: null,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      }

      useRestaurantStore.getState().setRestaurante(mockRestaurante as any)

      expect(useRestaurantStore.getState().error).toBeNull()
    })
  })

  describe('limparSelecao', () => {
    it('deve limpar restaurante selecionado', () => {
      useRestaurantStore.setState({
        restauranteSelecionado: {
          id: 'rest-1',
          nome: 'Teste',
          cnpj: '123',
          endereco: 'Endereço',
          telefone: '119999',
          logoUrl: null,
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      })

      useRestaurantStore.getState().limparSelecao()

      expect(useRestaurantStore.getState().restauranteSelecionado).toBeNull()
    })
  })

  describe('selectors', () => {
    it('selectTemRestauranteSelecionado deve retornar true quando há restaurante', () => {
      useRestaurantStore.setState({
        restauranteSelecionado: {
          id: 'rest-1',
          nome: 'Teste',
          cnpj: '123',
          endereco: 'Endereço',
          telefone: '119999',
          logoUrl: null,
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      })

      const state = useRestaurantStore.getState()
      expect(selectTemRestauranteSelecionado(state)).toBe(true)
    })

    it('selectTemRestauranteSelecionado deve retornar false quando não há restaurante', () => {
      useRestaurantStore.setState({ restauranteSelecionado: null })

      const state = useRestaurantStore.getState()
      expect(selectTemRestauranteSelecionado(state)).toBe(false)
    })
  })
})