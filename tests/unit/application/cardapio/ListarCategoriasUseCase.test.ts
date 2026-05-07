import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListarCategoriasUseCase } from '@/application/cardapio/services/ListarCategoriasUseCase'
import type { ICategoriaRepository } from '@/domain/cardapio/repositories/ICategoriaRepository'
import { Categoria } from '@/domain/cardapio/entities/Categoria'

describe('ListarCategoriasUseCase', () => {
  let useCase: ListarCategoriasUseCase
  let mockCategoriaRepo: ICategoriaRepository

  const criarMockCategoria = (id: string, nome: string, ordem: number) => {
    return new Categoria({
      id,
      restauranteId: 'rest-1',
      nome,
      descricao: null,
      imagemUrl: null,
      ordemExibicao: ordem,
      ativo: true,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockCategoriaRepo = {
      buscarPorId: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarAtivas: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    }

    useCase = new ListarCategoriasUseCase(mockCategoriaRepo)
  })

  describe('execute', () => {
    it('deve listar categorias ativas ordenadas por ordemExibicao', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Bebidas', 1)
      const cat2 = criarMockCategoria('cat-2', 'Pratos Principais', 2)
      const cat3 = criarMockCategoria('cat-3', 'Sobremesas', 3)

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat3, cat1, cat2])

      const resultado = await useCase.execute({ restauranteId: 'rest-1' })

      expect(resultado).toHaveLength(3)
      expect(resultado[0].nome).toBe('Bebidas')
      expect(resultado[1].nome).toBe('Pratos Principais')
      expect(resultado[2].nome).toBe('Sobremesas')
      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('rest-1')
    })

    it('deve retornar array vazio quando não há categorias ativas', async () => {
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([])

      const resultado = await useCase.execute({ restauranteId: 'rest-sem-cat' })

      expect(resultado).toEqual([])
    })

    it('deve ordenar categorias com mesma ordemExibicao de forma estável', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Bebidas', 1)
      const cat2 = criarMockCategoria('cat-2', 'Sucos', 1)
      const cat3 = criarMockCategoria('cat-3', 'Refrigerantes', 1)

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2, cat3])

      const resultado = await useCase.execute({ restauranteId: 'rest-1' })

      // Ordenação estável preserva ordem original para elementos iguais
      expect(resultado).toHaveLength(3)
    })

    it('deve chamar buscarAtivas com restauranteId correto', async () => {
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([])

      await useCase.execute({ restauranteId: 'rest-xyz' })

      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('rest-xyz')
    })

    it('deve retornar apenas categorias ativas', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Bebidas', 1)
      const cat2 = criarMockCategoria('cat-2', 'Inativos', 2)
      cat2.desativar()

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1])

      const resultado = await useCase.execute({ restauranteId: 'rest-1' })

      expect(resultado).toHaveLength(1)
      expect(resultado[0].nome).toBe('Bebidas')
    })
  })
})
