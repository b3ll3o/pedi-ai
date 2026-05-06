import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo'
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'

// Mock data
const mockRestaurante = { id: 'restaurante-123', nome: 'Restaurante Teste' }

// Mock do repositório de grupo de modificadores
const mockGrupoRepo = {
  buscarPorId: vi.fn(),
  buscarPorRestaurante: vi.fn(),
  buscarPorProduto: vi.fn(),
  salvar: vi.fn(),
  salvarMany: vi.fn(),
  excluir: vi.fn(),
}

// Mock do repositório de restaurantes
const mockRestauranteRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  findByCNPJ: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAtivo: vi.fn(),
}

// Mock do eventDispatcher
const mockEventDispatcher = {
  dispatch: vi.fn(),
}

// Test data builders
const criarValorModificador = (overrides: Partial<{
  id: string;
  nome: string;
  ajustePreco: number;
  ativo: boolean;
}> = {}) => {
  return {
    id: overrides.id ?? 'valor-123',
    nome: overrides.nome ?? 'Valor Teste',
    ajustePreco: overrides.ajustePreco ?? 500, // 5,00 em centavos
    ativo: overrides.ativo ?? true,
  }
}

const criarInputValido = (overrides: Partial<{
  restauranteId: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
  valores: Array<{ nome: string; ajustePreco: number }>;
}> = {}) => {
  return {
    restauranteId: overrides.restauranteId ?? 'restaurante-123',
    nome: overrides.nome ?? 'Grupo de Modificador Teste',
    obrigatorio: overrides.obrigatorio ?? false,
    minSelecoes: overrides.minSelecoes ?? 0,
    maxSelecoes: overrides.maxSelecoes ?? 3,
    valores: overrides.valores ?? [
      { nome: 'Opção 1', ajustePreco: 0 },
      { nome: 'Opção 2', ajustePreco: 200 },
    ],
  }
}

describe('CriarGrupoModificadorUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('deve criar grupo de modificador com dados válidos', async () => {
      // Arrange
      mockRestauranteRepo.findById.mockResolvedValue(mockRestaurante)
      mockGrupoRepo.salvar.mockImplementation(async (grupo) => grupo)

      // Import dinâmico para evitar erro se o use case não existir ainda
      const { CriarGrupoModificadorUseCase } = await import('@/application/admin/services/CriarGrupoModificadorUseCase')
      const useCase = new CriarGrupoModificadorUseCase(
        mockGrupoRepo,
        mockRestauranteRepo
      )

      const input = criarInputValido({ maxSelecoes: 2 })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(mockRestauranteRepo.findById).toHaveBeenCalledWith(input.restauranteId)
      expect(mockGrupoRepo.salvar).toHaveBeenCalled()
      expect(resultado.grupo).toBeDefined()
      expect(resultado.grupo.id).toBeDefined()
      expect(resultado.grupo.nome).toBe(input.nome)
      expect(resultado.grupo.restauranteId).toBe(input.restauranteId)
    })

    it('deve retornar grupo criado com ID', async () => {
      // Arrange
      mockRestauranteRepo.findById.mockResolvedValue(mockRestaurante)
      mockGrupoRepo.salvar.mockImplementation(async (grupo) => {
        // Simula a atribuição de ID pelo repositório
        return grupo
      })

      const { CriarGrupoModificadorUseCase } = await import('@/application/admin/services/CriarGrupoModificadorUseCase')
      const useCase = new CriarGrupoModificadorUseCase(
        mockGrupoRepo,
        mockRestauranteRepo
      )

      const input = criarInputValido({ maxSelecoes: 2 })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.grupo.id).toBeDefined()
      expect(typeof resultado.grupo.id).toBe('string')
      expect(resultado.grupo.id.length).toBeGreaterThan(0)
    })

    it('deve lançar erro se nome estiver vazio', async () => {
      // Arrange
      const { CriarGrupoModificadorUseCase } = await import('@/application/admin/services/CriarGrupoModificadorUseCase')
      const useCase = new CriarGrupoModificadorUseCase(
        mockGrupoRepo,
        mockRestauranteRepo,
        mockEventDispatcher
      )

      const input = criarInputValido({ nome: '' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Nome é obrigatório')
    })

    it('deve lançar erro se restaurante não existir', async () => {
      // Arrange
      mockRestauranteRepo.findById.mockResolvedValue(null)

      const { CriarGrupoModificadorUseCase } = await import('@/application/admin/services/CriarGrupoModificadorUseCase')
      const useCase = new CriarGrupoModificadorUseCase(
        mockGrupoRepo,
        mockRestauranteRepo,
        mockEventDispatcher
      )

      const input = criarInputValido({ restauranteId: 'restaurante-inexistente' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Restaurante não encontrado')
    })

    it('deve criar grupo com valores de modificador', async () => {
      // Arrange
      mockRestauranteRepo.findById.mockResolvedValue(mockRestaurante)
      mockGrupoRepo.salvar.mockImplementation(async (grupo) => grupo)

      const { CriarGrupoModificadorUseCase } = await import('@/application/admin/services/CriarGrupoModificadorUseCase')
      const useCase = new CriarGrupoModificadorUseCase(
        mockGrupoRepo,
        mockRestauranteRepo,
        mockEventDispatcher
      )

      const valores = [
        { nome: 'Pequeno', ajustePreco: -100 },
        { nome: 'Médio', ajustePreco: 0 },
        { nome: 'Grande', ajustePreco: 300 },
      ]
      const input = criarInputValido({ valores })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(mockGrupoRepo.salvar).toHaveBeenCalled()
      expect(resultado.grupo.valores).toHaveLength(3)
    })

    it('deve definir propriedades de seleção corretamente', async () => {
      // Arrange
      mockRestauranteRepo.findById.mockResolvedValue(mockRestaurante)
      mockGrupoRepo.salvar.mockImplementation(async (grupo) => grupo)

      const { CriarGrupoModificadorUseCase } = await import('@/application/admin/services/CriarGrupoModificadorUseCase')
      const useCase = new CriarGrupoModificadorUseCase(
        mockGrupoRepo,
        mockRestauranteRepo,
        mockEventDispatcher
      )

      const input = criarInputValido({
        obrigatorio: true,
        minSelecoes: 1,
        maxSelecoes: 2,
      })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.grupo.obrigatorio).toBe(true)
      expect(resultado.grupo.minSelecoes).toBe(1)
      expect(resultado.grupo.maxSelecoes).toBe(2)
    })
  })
})
