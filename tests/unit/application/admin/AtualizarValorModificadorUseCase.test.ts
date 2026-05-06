import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo'
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'

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
  nome: string;
  ajustePreco: number;
  ativo: boolean;
}> = {}) => {
  return {
    grupoId: overrides.grupoId ?? 'grupo-123',
    valorId: overrides.valorId ?? 'valor-123',
    nome: overrides.nome ?? 'Valor Atualizado',
    ajustePreco: overrides.ajustePreco ?? 1000,
    ativo: overrides.ativo ?? true,
  }
}

describe('AtualizarValorModificadorUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('deve atualizar valor de modificador com dados válidos', async () => {
      // Arrange
      const valorData = criarValorValido()
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido()

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(mockGrupoRepo.buscarPorId).toHaveBeenCalledWith(input.grupoId)
      expect(mockGrupoRepo.salvar).toHaveBeenCalled()
      expect(resultado.valor).toBeDefined()
      expect(resultado.valor.nome).toBe(input.nome)
      expect(resultado.valor.ajustePreco.valor).toBe(input.ajustePreco)
    })

    it('deve retornar valor atualizado com dados corretos', async () => {
      // Arrange
      const valorData = criarValorValido({ nome: 'Nome Antigo', ajustePreco: 500 })
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({
        nome: 'Nome Novo',
        ajustePreco: 1500
      })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.valor.nome).toBe('Nome Novo')
      expect(resultado.valor.ajustePreco.valor).toBe(1500)
      expect(resultado.valor.id).toBe(valorData.id)
    })

    it('deve lançar erro se valor não existir', async () => {
      // Arrange
      const grupoData = criarGrupoValido({
        valores: []
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ valorId: 'valor-inexistente' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Valor de modificador não encontrado')
    })

    it('deve lançar erro se grupo não existir', async () => {
      // Arrange
      mockGrupoRepo.buscarPorId.mockResolvedValue(null)

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ grupoId: 'grupo-inexistente' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Grupo de modificador não encontrado')
    })

    it('deve lançar erro se nome estiver vazio', async () => {
      // Arrange
      const valorData = criarValorValido()
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ nome: '' })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Nome é obrigatório')
    })

    it('deve atualizar apenas o nome quando apenas nome for fornecido', async () => {
      // Arrange
      const valorData = criarValorValido({ nome: 'Nome Original', ajustePreco: 500 })
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = {
        grupoId: 'grupo-123',
        valorId: 'valor-123',
        nome: 'Nome Atualizado',
        // Sem ajustePreco - não deve atualizar
      }

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.valor.nome).toBe('Nome Atualizado')
      expect(resultado.valor.ajustePreco.valor).toBe(500) // Mantém o valor original
    })

    it('deve atualizar apenas o preço quando apenas preço for fornecido', async () => {
      // Arrange
      const valorData = criarValorValido({ nome: 'Nome Original', ajustePreco: 500 })
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = {
        grupoId: 'grupo-123',
        valorId: 'valor-123',
        // Sem nome - não deve atualizar
        ajustePreco: 2000,
      }

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.valor.nome).toBe('Nome Original') // Mantém o nome original
      expect(resultado.valor.ajustePreco.valor).toBe(2000)
    })

    it('deve ativar valor quando ativo=true for fornecido', async () => {
      // Arrange
      const valorData = criarValorValido({ ativo: false })
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ ativo: true })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.valor.ativo).toBe(true)
    })

    it('deve desativar valor quando ativo=false for fornecido', async () => {
      // Arrange
      const valorData = criarValorValido({ ativo: true })
      const grupoData = criarGrupoValido({
        valores: [ModificadorValor.reconstruir(valorData)]
      })
      mockGrupoRepo.buscarPorId.mockResolvedValue(ModificadorGrupo.reconstruir(grupoData))
      mockGrupoRepo.salvar.mockImplementation(async (g) => g)

      const { AtualizarValorModificadorUseCase } = await import('@/application/admin/services/AtualizarValorModificadorUseCase')
      const useCase = new AtualizarValorModificadorUseCase(mockGrupoRepo)

      const input = criarInputValido({ ativo: false })

      // Act
      const resultado = await useCase.execute(input)

      // Assert
      expect(resultado.valor.ativo).toBe(false)
    })
  })
})
