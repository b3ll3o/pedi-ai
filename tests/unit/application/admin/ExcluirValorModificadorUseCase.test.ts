import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo'
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor'
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro'

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

const criarValorValido = (overrides: Partial<{
  id: string;
  modificadorGrupoId: string;
  restauranteId: string;
  nome: string;
  ajustePreco: number;
  ativo: boolean;
}> = {}) => {
  return {
    id: overrides.id ?? 'valor-123',
    modificadorGrupoId: overrides.modificadorGrupoId ?? 'grupo-123',
    restauranteId: overrides.restauranteId ?? 'restaurante-123',
    nome: overrides.nome ?? 'Valor Teste',
    ajustePreco: Dinheiro.criar(overrides.ajustePreco ?? 500),
    ativo: overrides.ativo ?? true,
  } as ModificadorValor
}

const criarInputValido = (overrides: Partial<{
  grupoId: string;
  valorId: string;
}> = {}) => {
  return {
    grupoId: overrides.grupoId ?? 'grupo-123',
    valorId: overrides.valorId ?? 'valor-123',
  }
}

describe('ExcluirValorModificadorUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('deve soft-delete valor de modificador com dados válidos', async () => {
      // Arrange
      const valorData = criarValorValido({ ativo: true })
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { ExcluirValorModificadorUseCase } = await import('@/application/admin/services/ExcluirValorModificadorUseCase')
      const useCase = new ExcluirValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido()

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(mockGrupoRepo.buscarPorId).toHaveBeenCalledWith(input.grupoId)
      expect(mockGrupoRepo.salvar).toHaveBeenCalled()
      expect(resultado.sucesso).toBe(true)
    })

    it('deve desativar o valor (soft-delete)', async () => {
      // Arrange
      const valorData = criarValorValido({ ativo: true })
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      const grupo = ModificadorGrupo.reconstruir(grupoData)
      mockGrupoRepo.buscarPorId.mockResolvedValue(grupo)
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { ExcluirValorModificadorUseCase } = await import('@/application/admin/services/ExcluirValorModificadorUseCase')
      const useCase = new ExcluirValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido()

      // Act
      await useCase.execute(input)

      // Assert
      const valorAposExclusao = grupo.getValor(input.valorId)
      expect(valorAposExclusao?.ativo).toBe(false)
    })

    it('deve lançar erro se valor não existir', async () => {
      // Arrange
      const grupoData = criarGrupoValido({
        valores: []
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))

      const { ExcluirValorModificadorUseCase } = await import('@/application/admin/services/ExcluirValorModificadorUseCase')
      const useCase = new ExcluirValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ valorId: 'valor-inexistente' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Valor de modificador não encontrado')
    })

    it('deve lançar erro se grupo não existir', async () => {
      // Arrange
      mockGrupoRepo.buscarPorId.mockResolvedValue(null)

      const { ExcluirValorModificadorUseCase } = await import('@/application/admin/services/ExcluirValorModificadorUseCase')
      const useCase = new ExcluirValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ grupoId: 'grupo-inexistente' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Grupo de modificador não encontrado')
    })

    it('deve chamar grupoRepo.salvar após soft-delete', async () => {
      // Arrange
      const valorData = criarValorValido()
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { ExcluirValorModificadorUseCase } = await import('@/application/admin/services/ExcluirValorModificadorUseCase')
      const useCase = new ExcluirValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido()

      // Act
      await useCase.execute(input)

      // Assert
      expect(mockGrupoRepo.salvar).toHaveBeenCalledTimes(1)
    })
  })
})
