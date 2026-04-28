import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo'
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor'

// Mock do repositório de grupo de modificadores
const mockGrupoRepo = {
  buscarPorId: vi.fn(),
  buscarPorRestaurante: vi.fn(),
  buscarPorProduto: vi.fn(),
  salvar: vi.fn(),
  salvarMany: vi.fn(),
  excluir: vi.fn(),
}

// Test data builders
const criarGrupoValido = (overrides: Partial<{
  id: string;
  restauranteId: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
  ativo: boolean;
  valores: ModificadorValor[];
}> = {}) => {
  return {
    id: overrides.id ?? 'grupo-123',
    restauranteId: overrides.restauranteId ?? 'restaurante-123',
    nome: overrides.nome ?? 'Grupo de Modificador Teste',
    obrigatorio: overrides.obrigatorio ?? false,
    minSelecoes: overrides.minSelecoes ?? 0,
    maxSelecoes: overrides.maxSelecoes ?? 3,
    ativo: overrides.ativo ?? true,
    valores: overrides.valores ?? [],
  }
}

const criarInputValido = (overrides: Partial<{
  grupoId: string;
  nome: string;
  ajustePreco: number;
  ativo: boolean;
}> = {}) => {
  return {
    grupoId: overrides.grupoId ?? 'grupo-123',
    nome: overrides.nome ?? 'Valor Teste',
    ajustePreco: overrides.ajustePreco ?? 500, // 5,00 em centavos
    ativo: overrides.ativo ?? true,
  }
}

describe('CriarValorModificadorUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('deve criar valor de modificador com dados válidos', async () => {
      // Arrange
      const grupoData = criarGrupoValido()
      const grupo = ModificadorGrupo.criar(grupoData)
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(criarGrupoValido()))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { CriarValorModificadorUseCase } = await import('@/application/admin/services/CriarValorModificadorUseCase')
      const useCase = new CriarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido()

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(mockGrupoRepo.buscarPorId).toHaveBeenCalledWith(input.grupoId)
      expect(mockGrupoRepo.salvar).toHaveBeenCalled()
      expect(resultado.valor).toBeDefined()
      expect(resultado.valor.nome).toBe(input.nome)
      expect(resultado.valor.modificadorGrupoId).toBe(input.grupoId)
    })

    it('deve retornar valor criado com ID', async () => {
      // Arrange
      const grupoData = criarGrupoValido()
      const grupo = ModificadorGrupo.criar(grupoData)
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(criarGrupoValido()))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { CriarValorModificadorUseCase } = await import('@/application/admin/services/CriarValorModificadorUseCase')
      const useCase = new CriarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido()

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.valor.id).toBeDefined()
      expect(typeof resultado.valor.id).toBe('string')
      expect(resultado.valor.id.length).toBeGreaterThan(0)
    })

    it('deve lançar erro se grupo não existir', async () => {
      // Arrange
      mockGrupoRepo.buscarPorId.mockResolvedValue(null)

      const { CriarValorModificadorUseCase } = await import('@/application/admin/services/CriarValorModificadorUseCase')
      const useCase = new CriarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ grupoId: 'grupo-inexistente' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Grupo de modificador não encontrado')
    })

    it('deve lançar erro se nome estiver vazio', async () => {
      // Arrange
      const grupoData = criarGrupoValido()
      const grupo = ModificadorGrupo.criar(grupoData)
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(criarGrupoValido()))

      const { CriarValorModificadorUseCase } = await import('@/application/admin/services/CriarValorModificadorUseCase')
      const useCase = new CriarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ nome: '' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Nome é obrigatório')
    })

    it('deve criar valor com ajuste de preço correto', async () => {
      // Arrange
      const grupoData = criarGrupoValido()
      const grupo = ModificadorGrupo.criar(grupoData)
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(criarGrupoValido()))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { CriarValorModificadorUseCase } = await import('@/application/admin/services/CriarValorModificadorUseCase')
      const useCase = new CriarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ ajustePreco: 1500 }) // 15,00

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.valor.ajustePreco.valor).toBe(1500)
    })

    it('deve adicionar valor ao grupo', async () => {
      // Arrange
      const grupoData = criarGrupoValido()
      const grupo = ModificadorGrupo.reconstruir(grupoData)
      mockGrupoRepo.buscarPorId.mockResolvedValue(grupo)
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { CriarValorModificadorUseCase } = await import('@/application/admin/services/CriarValorModificadorUseCase')
      const useCase = new CriarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido()

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(grupo.temValor(resultado.valor.id)).toBe(true)
    })
  })
})
