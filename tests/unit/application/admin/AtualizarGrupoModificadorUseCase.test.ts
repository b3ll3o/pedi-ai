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
const _criarValorModificador = (overrides: Partial<{
  id: string;
  nome: string;
  ajustePreco: number;
  ativo: boolean;
}> = {}) => {
  return {
    id: overrides.id ?? 'valor-123',
    nome: overrides.nome ?? 'Valor Teste',
    ajustePreco: overrides.ajustePreco ?? 500,
    ativo: overrides.ativo ?? true,
  }
}

const criarGrupoModificador = (overrides: Partial<{
  id: string;
  restauranteId: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
  valores: ModificadorValor[];
}> = {}) => {
  const valores = overrides.valores ?? []
  const props = {
    id: overrides.id ?? 'grupo-123',
    restauranteId: overrides.restauranteId ?? 'restaurante-123',
    nome: overrides.nome ?? 'Grupo Teste',
    obrigatorio: overrides.obrigatorio ?? false,
    minSelecoes: overrides.minSelecoes ?? 0,
    maxSelecoes: overrides.maxSelecoes ?? valores.length,
    valores,
  }
  return ModificadorGrupo.reconstruir(props)
}

const criarInputValido = (overrides: Partial<{
  id: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
}> = {}) => {
  return {
    id: overrides.id ?? 'grupo-123',
    nome: overrides.nome ?? 'Grupo Atualizado',
    obrigatorio: overrides.obrigatorio ?? false,
    minSelecoes: overrides.minSelecoes ?? 0,
    maxSelecoes: overrides.maxSelecoes ?? 0,
  }
}

describe('AtualizarGrupoModificadorUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('deve atualizar grupo de modificador com dados válidos', async () => {
      // Arrange
      const grupoExistente = criarGrupoModificador()
      mockGrupoRepo.buscarPorId.mockResolvedValue(grupoExistente)
      mockGrupoRepo.salvar.mockImplementation(async (grupo) => grupo)

      const { AtualizarGrupoModificadorUseCase } = await import('@/application/admin/services/AtualizarGrupoModificadorUseCase')
      const useCase = new AtualizarGrupoModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ nome: 'Novo Nome' })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(mockGrupoRepo.buscarPorId).toHaveBeenCalledWith(input.id)
      expect(mockGrupoRepo.salvar).toHaveBeenCalled()
      expect(resultado.grupo).toBeDefined()
      expect(resultado.grupo.nome).toBe(input.nome)
    })

    it('deve retornar grupo atualizado', async () => {
      // Arrange
      const grupoExistente = criarGrupoModificador({ nome: 'Nome Antigo' })
      mockGrupoRepo.buscarPorId.mockResolvedValue(grupoExistente)
      mockGrupoRepo.salvar.mockImplementation(async (grupo) => grupo)

      const { AtualizarGrupoModificadorUseCase } = await import('@/application/admin/services/AtualizarGrupoModificadorUseCase')
      const useCase = new AtualizarGrupoModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ nome: 'Nome Novo' })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.grupo.nome).toBe('Nome Novo')
    })

    it('deve lançar erro se grupo não existir', async () => {
      // Arrange
      mockGrupoRepo.buscarPorId.mockResolvedValue(null)

      const { AtualizarGrupoModificadorUseCase } = await import('@/application/admin/services/AtualizarGrupoModificadorUseCase')
      const useCase = new AtualizarGrupoModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ id: 'grupo-inexistente' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Grupo de modificador não encontrado')
    })

    it('deve lançar erro se nome estiver vazio', async () => {
      // Arrange
      const grupoExistente = criarGrupoModificador()
      mockGrupoRepo.buscarPorId.mockResolvedValue(grupoExistente)

      const { AtualizarGrupoModificadorUseCase } = await import('@/application/admin/services/AtualizarGrupoModificadorUseCase')
      const useCase = new AtualizarGrupoModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ nome: '' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Nome é obrigatório')
    })
  })
})
