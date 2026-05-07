import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListarCardapioUseCase } from '@/application/cardapio/services/ListarCardapioUseCase'
import type { ICategoriaRepository } from '@/domain/cardapio/repositories/ICategoriaRepository'
import type { IItemCardapioRepository } from '@/domain/cardapio/repositories/IItemCardapioRepository'
import { Categoria } from '@/domain/cardapio/entities/Categoria'
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio'
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico'

describe('ListarCardapioUseCase', () => {
  let useCase: ListarCardapioUseCase
  let mockCategoriaRepo: ICategoriaRepository
  let mockItemCardapioRepo: IItemCardapioRepository

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

  const criarMockItem = (id: string, categoriaId: string, nome: string, precoEmCentavos: number) => {
    return new ItemCardapio({
      id,
      categoriaId,
      restauranteId: 'rest-1',
      nome,
      descricao: null,
      preco: Dinheiro.criar(precoEmCentavos),
      imagemUrl: null,
      tipo: TipoItemCardapio.PRODUTO,
      labelsDieteticos: [],
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

    mockItemCardapioRepo = {
      buscarPorId: vi.fn(),
      buscarPorCategoria: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarAtivos: vi.fn(),
      buscarPorIds: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    }

    useCase = new ListarCardapioUseCase(mockCategoriaRepo, mockItemCardapioRepo)
  })

  describe('execute', () => {
    it('deve listar cardápio com categorias e itens ordenados', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Bebidas', 1)
      const cat2 = criarMockCategoria('cat-2', 'Pratos Principais', 2)

      const item1 = criarMockItem('item-1', 'cat-1', 'Refrigerante', 500)
      const item2 = criarMockItem('item-2', 'cat-1', 'Suco', 700)
      const item3 = criarMockItem('item-3', 'cat-2', 'Picanha', 4500)

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2])
      mockItemCardapioRepo.buscarAtivos
        .mockResolvedValueOnce([item1, item2])
        .mockResolvedValueOnce([item3])

      const resultado = await useCase.execute({ restauranteId: 'rest-1' })

      expect(resultado.categorias).toHaveLength(2)
      expect(resultado.categorias[0].categoria.nome).toBe('Bebidas')
      expect(resultado.categorias[0].itens).toHaveLength(2)
      // Itens devem estar ordenados por nome
      expect(resultado.categorias[0].itens[0].nome).toBe('Refrigerante')
      expect(resultado.categorias[0].itens[1].nome).toBe('Suco')
      expect(resultado.categorias[1].categoria.nome).toBe('Pratos Principais')
      expect(resultado.categorias[1].itens).toHaveLength(1)
      expect(resultado.categorias[1].itens[0].nome).toBe('Picanha')
    })

    it('deve ordenar categorias por ordemExibicao', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Sobremesas', 3)
      const cat2 = criarMockCategoria('cat-2', 'Entradas', 1)
      const cat3 = criarMockCategoria('cat-3', 'Pratos Principais', 2)

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2, cat3])
      mockItemCardapioRepo.buscarAtivos.mockResolvedValue([])

      const resultado = await useCase.execute({ restauranteId: 'rest-1' })

      expect(resultado.categorias).toHaveLength(3)
      expect(resultado.categorias[0].categoria.nome).toBe('Entradas')
      expect(resultado.categorias[1].categoria.nome).toBe('Pratos Principais')
      expect(resultado.categorias[2].categoria.nome).toBe('Sobremesas')
    })

    it('deve retornar array vazio quando não há categorias ativas', async () => {
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([])

      const resultado = await useCase.execute({ restauranteId: 'rest-sem-cat' })

      expect(resultado.categorias).toEqual([])
    })

    it('deve buscar itens ativos para cada categoria', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Bebidas', 1)
      const cat2 = criarMockCategoria('cat-2', 'Pratos', 2)

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2])
      mockItemCardapioRepo.buscarAtivos
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      await useCase.execute({ restauranteId: 'rest-1' })

      expect(mockItemCardapioRepo.buscarAtivos).toHaveBeenCalledTimes(2)
      expect(mockItemCardapioRepo.buscarAtivos).toHaveBeenCalledWith('cat-1')
      expect(mockItemCardapioRepo.buscarAtivos).toHaveBeenCalledWith('cat-2')
    })

    it('deve ordenar itens de cada categoria por nome', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Lanches', 1)

      const itemZ = criarMockItem('item-1', 'cat-1', 'X-Salada', 1500)
      const itemA = criarMockItem('item-2', 'cat-1', 'Big Mac', 2500)
      const itemM = criarMockItem('item-3', 'cat-1', 'Mcb', 2000)

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1])
      mockItemCardapioRepo.buscarAtivos.mockResolvedValue([itemZ, itemA, itemM])

      const resultado = await useCase.execute({ restauranteId: 'rest-1' })

      expect(resultado.categorias[0].itens[0].nome).toBe('Big Mac')
      expect(resultado.categorias[0].itens[1].nome).toBe('Mcb')
      expect(resultado.categorias[0].itens[2].nome).toBe('X-Salada')
    })

    it('deve chamar buscarAtivas com restauranteId correto', async () => {
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([])

      await useCase.execute({ restauranteId: 'rest-xyz' })

      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('rest-xyz')
    })

    it('deve lidar com categoria sem itens ativos', async () => {
      const cat1 = criarMockCategoria('cat-1', 'Bebidas', 1)
      const cat2 = criarMockCategoria('cat-2', 'Promoções', 2)

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2])
      mockItemCardapioRepo.buscarAtivos
        .mockResolvedValueOnce([criarMockItem('item-1', 'cat-1', 'Coca', 500)])
        .mockResolvedValueOnce([])

      const resultado = await useCase.execute({ restauranteId: 'rest-1' })

      expect(resultado.categorias).toHaveLength(2)
      expect(resultado.categorias[0].itens).toHaveLength(1)
      expect(resultado.categorias[1].itens).toHaveLength(0)
    })
  })
})
