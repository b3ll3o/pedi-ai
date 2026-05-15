import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRestaurantStore, selectTemRestauranteSelecionado, selectRestauranteSelecionado, selectRestaurantesAcessiveis, selectIsLoading, selectError } from '@/infrastructure/persistence/restaurantStore'

// Mock da database
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
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('deve ter estado inicial correto', () => {
      const state = useRestaurantStore.getState()

      expect(state.restauranteSelecionado).toBeNull()
      expect(state.restaurantesAcessiveis).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('deve iniciar com restaurantesAcessiveis vazio', () => {
      const state = useRestaurantStore.getState()
      expect(state.restaurantesAcessiveis).toHaveLength(0)
    })

    it('deve iniciar com isLoading false', () => {
      const state = useRestaurantStore.getState()
      expect(state.isLoading).toBe(false)
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
        deletedAt: null,
        version: 1,
      }

      useRestaurantStore.getState().setRestaurante(mockRestaurante as any)

      const state = useRestaurantStore.getState()
      expect(state.restauranteSelecionado).toEqual({
        id: 'rest-1',
        nome: 'Restaurante Teste',
        cnpj: '12345678900000',
        endereco: 'Rua Teste',
        telefone: '1199999999',
        logoUrl: null,
        ativo: true,
        criadoEm: mockRestaurante.criadoEm,
        atualizadoEm: mockRestaurante.atualizadoEm,
        deletedAt: null,
        version: 1,
      })
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
        deletedAt: null,
        version: 1,
      }

      useRestaurantStore.getState().setRestaurante(mockRestaurante as any)

      expect(useRestaurantStore.getState().error).toBeNull()
    })

    it('deve sobrescrever restaurante previamente selecionado', () => {
      useRestaurantStore.setState({
        restauranteSelecionado: {
          id: 'rest-antigo',
          nome: 'Antigo',
          cnpj: '000',
          endereco: 'Addr',
          telefone: '000',
          logoUrl: null,
          ativo: false,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          deletedAt: null,
          version: 1,
        },
      })

      const novoRestaurante = {
        id: 'rest-novo',
        nome: 'Novo Restaurante',
        cnpj: '12345678900000',
        endereco: 'Rua Nova',
        telefone: '1199999999',
        logoUrl: null,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        deletedAt: null,
        version: 1,
      }

      useRestaurantStore.getState().setRestaurante(novoRestaurante as any)

      const state = useRestaurantStore.getState()
      expect(state.restauranteSelecionado?.id).toBe('rest-novo')
      expect(state.restauranteSelecionado?.nome).toBe('Novo Restaurante')
    })

    it('deve preservar propriedades do restaurante em RestauranteProps', () => {
      const mockRestaurante = {
        id: 'rest-1',
        nome: 'Teste',
        cnpj: '123',
        endereco: 'Endereço',
        telefone: '119999',
        logoUrl: 'https://example.com/logo.png',
        ativo: true,
        criadoEm: new Date('2024-01-01'),
        atualizadoEm: new Date('2024-01-02'),
        deletedAt: null,
        version: 5,
      }

      useRestaurantStore.getState().setRestaurante(mockRestaurante as any)

      const state = useRestaurantStore.getState()
      expect(state.restauranteSelecionado?.logoUrl).toBe('https://example.com/logo.png')
      expect(state.restauranteSelecionado?.version).toBe(5)
      expect(state.restauranteSelecionado?.criadoEm).toEqual(new Date('2024-01-01'))
    })

    it('deve preservar deletedAt quando restaurante tem soft delete', () => {
      const mockRestaurante = {
        id: 'rest-1',
        nome: 'Teste',
        cnpj: '123',
        endereco: 'Endereço',
        telefone: '119999',
        logoUrl: null,
        ativo: false,
        criadoEm: new Date('2024-01-01'),
        atualizadoEm: new Date('2024-01-02'),
        deletedAt: new Date('2024-01-03'),
        version: 1,
      }

      useRestaurantStore.getState().setRestaurante(mockRestaurante as any)

      const state = useRestaurantStore.getState()
      expect(state.restauranteSelecionado?.deletedAt).toEqual(new Date('2024-01-03'))
      expect(state.restauranteSelecionado?.ativo).toBe(false)
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
          deletedAt: null,
          version: 1,
        },
      })

      useRestaurantStore.getState().limparSelecao()

      expect(useRestaurantStore.getState().restauranteSelecionado).toBeNull()
    })

    it('deve limpar sem afetar outros estados', () => {
      useRestaurantStore.setState({
        restaurantesAcessiveis: [
          {
            id: 'rest-1',
            nome: 'Teste',
            cnpj: '123',
            endereco: 'Endereço',
            telefone: '119999',
            logoUrl: null,
            ativo: true,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
            deletedAt: null,
            version: 1,
          },
        ],
        isLoading: true,
        error: 'algum erro',
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
          deletedAt: null,
          version: 1,
        },
      })

      useRestaurantStore.getState().limparSelecao()

      const state = useRestaurantStore.getState()
      expect(state.restauranteSelecionado).toBeNull()
      expect(state.restaurantesAcessiveis).toHaveLength(1)
      expect(state.isLoading).toBe(true)
      expect(state.error).toBe('algum erro')
    })

    it('deve funcionar quando não há restaurante selecionado', () => {
      expect(() => useRestaurantStore.getState().limparSelecao()).not.toThrow()
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
          deletedAt: null,
          version: 1,
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

    it('selectRestauranteSelecionado deve retornar restaurante selecionado', () => {
      const mockRestaurante = {
        id: 'rest-1',
        nome: 'Teste',
        cnpj: '123',
        endereco: 'Endereço',
        telefone: '119999',
        logoUrl: null,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        deletedAt: null,
        version: 1,
      }
      useRestaurantStore.setState({ restauranteSelecionado: mockRestaurante })

      const state = useRestaurantStore.getState()
      expect(selectRestauranteSelecionado(state)).toEqual(mockRestaurante)
    })

    it('selectRestauranteSelecionado deve retornar null quando nada selecionado', () => {
      useRestaurantStore.setState({ restauranteSelecionado: null })

      const state = useRestaurantStore.getState()
      expect(selectRestauranteSelecionado(state)).toBeNull()
    })

    it('selectRestaurantesAcessiveis deve retornar lista de restaurantes', () => {
      const mockRestaurantes = [
        {
          id: 'rest-1',
          nome: 'Restaurante 1',
          cnpj: '123',
          endereco: 'Endereço 1',
          telefone: '111',
          logoUrl: null,
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          deletedAt: null,
          version: 1,
        },
        {
          id: 'rest-2',
          nome: 'Restaurante 2',
          cnpj: '456',
          endereco: 'Endereço 2',
          telefone: '222',
          logoUrl: null,
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          deletedAt: null,
          version: 1,
        },
      ]
      useRestaurantStore.setState({ restaurantesAcessiveis: mockRestaurantes })

      const state = useRestaurantStore.getState()
      expect(selectRestaurantesAcessiveis(state)).toEqual(mockRestaurantes)
      expect(selectRestaurantesAcessiveis(state)).toHaveLength(2)
    })

    it('selectRestaurantesAcessiveis deve retornar array vazio quando nenhum restaurante', () => {
      useRestaurantStore.setState({ restaurantesAcessiveis: [] })

      const state = useRestaurantStore.getState()
      expect(selectRestaurantesAcessiveis(state)).toEqual([])
    })

    it('selectIsLoading deve retornar estado de loading', () => {
      useRestaurantStore.setState({ isLoading: true })

      const state = useRestaurantStore.getState()
      expect(selectIsLoading(state)).toBe(true)
    })

    it('selectIsLoading deve retornar false quando não está carregando', () => {
      useRestaurantStore.setState({ isLoading: false })

      const state = useRestaurantStore.getState()
      expect(selectIsLoading(state)).toBe(false)
    })

    it('selectError deve retornar mensagem de erro', () => {
      useRestaurantStore.setState({ error: 'Erro teste' })

      const state = useRestaurantStore.getState()
      expect(selectError(state)).toBe('Erro teste')
    })

    it('selectError deve retornar null quando não há erro', () => {
      useRestaurantStore.setState({ error: null })

      const state = useRestaurantStore.getState()
      expect(selectError(state)).toBeNull()
    })
  })
})
