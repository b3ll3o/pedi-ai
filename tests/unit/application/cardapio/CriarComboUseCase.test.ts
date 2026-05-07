import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CriarComboUseCase, type CriarComboInput } from '@/application/cardapio/services/CriarComboUseCase'
import type { IItemCardapioRepository } from '@/domain/cardapio/repositories/IItemCardapioRepository'
import type { EventDispatcher } from '@/domain/shared'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio'
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio'
import { Combo } from '@/domain/cardapio/entities/Combo'
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico'

describe('CriarComboUseCase', () => {
  let useCase: CriarComboUseCase
  let mockItemCardapioRepo: IItemCardapioRepository
  let mockComboRepo: IItemCardapioRepository
  let mockEventDispatcher: EventDispatcher

  const criarMockProduto = (id: string, nome: string, precoEmCentavos: number) => {
    return new ItemCardapio({
      id,
      categoriaId: 'cat-1',
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

    mockComboRepo = {
      buscarPorId: vi.fn(),
      buscarPorCategoria: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarAtivos: vi.fn(),
      buscarPorIds: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    }

    mockEventDispatcher = {
      dispatch: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
    }

    useCase = new CriarComboUseCase(
      mockItemCardapioRepo,
      mockComboRepo,
      mockEventDispatcher as unknown as EventDispatcher
    )
  })

  describe('execute', () => {
    it('deve criar combo com dados válidos', async () => {
      const produto1 = criarMockProduto('prod-1', 'Hambúrguer', 2500)
      const produto2 = criarMockProduto('prod-2', 'Refrigerante', 500)

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1, produto2])

      const comboPersistido = new Combo({
        id: 'combo-1',
        restauranteId: 'rest-1',
        nome: 'Combo Família',
        descricao: 'Combo completo',
        precoBundle: Dinheiro.criar(2800),
        imagemUrl: null,
        itens: [
          { produtoId: 'prod-1', quantidade: 1 },
          { produtoId: 'prod-2', quantidade: 1 },
        ],
        ativo: true,
      })
      mockItemCardapioRepo.salvar.mockResolvedValue(comboPersistido as unknown as ItemCardapio)

      const input: CriarComboInput = {
        restauranteId: 'rest-1',
        nome: 'Combo Família',
        descricao: 'Combo completo',
        precoBundle: 2800,
        imagemUrl: null,
        itens: [
          { produtoId: 'prod-1', quantidade: 1 },
          { produtoId: 'prod-2', quantidade: 1 },
        ],
      }

      const resultado = await useCase.execute(input)

      expect(resultado.combo).toBeDefined()
      expect(resultado.combo.nome).toBe('Combo Família')
      expect(resultado.calculoDesconto).toBeDefined()
      expect(mockEventDispatcher.dispatch).toHaveBeenCalled()
    })

    it('deve lançar erro quando combo não tem itens', async () => {
      const input: CriarComboInput = {
        restauranteId: 'rest-1',
        nome: 'Combo Vazio',
        descricao: null,
        precoBundle: 1000,
        imagemUrl: null,
        itens: [],
      }

      await expect(useCase.execute(input)).rejects.toThrow('Combo deve ter pelo menos um item')
    })

    it('deve lançar erro quando combo tem itens undefined', async () => {
      const input = {
        restauranteId: 'rest-1',
        nome: 'Combo Invalido',
        descricao: null,
        precoBundle: 1000,
        imagemUrl: null,
        itens: undefined,
      } as unknown as CriarComboInput

      await expect(useCase.execute(input)).rejects.toThrow('Combo deve ter pelo menos um item')
    })

    it('deve lançar erro quando produto não é encontrado', async () => {
      const produto1 = criarMockProduto('prod-1', 'Hambúrguer', 2500)

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1])

      const input: CriarComboInput = {
        restauranteId: 'rest-1',
        nome: 'Combo',
        descricao: null,
        precoBundle: 2000,
        imagemUrl: null,
        itens: [
          { produtoId: 'prod-1', quantidade: 1 },
          { produtoId: 'prod-2', quantidade: 1 },
        ],
      }

      await expect(useCase.execute(input)).rejects.toThrow('Produtos não encontrados: prod-2')
    })

    it('deve calcular desconto corretamente', async () => {
      const produto1 = criarMockProduto('prod-1', 'Hambúrguer', 2500)
      const produto2 = criarMockProduto('prod-2', 'Refrigerante', 500)

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1, produto2])

      const comboPersistido = new Combo({
        id: 'combo-1',
        restauranteId: 'rest-1',
        nome: 'Combo Família',
        descricao: null,
        precoBundle: Dinheiro.criar(2500),
        imagemUrl: null,
        itens: [
          { produtoId: 'prod-1', quantidade: 1 },
          { produtoId: 'prod-2', quantidade: 1 },
        ],
        ativo: true,
      })
      mockItemCardapioRepo.salvar.mockResolvedValue(comboPersistido as unknown as ItemCardapio)

      const input: CriarComboInput = {
        restauranteId: 'rest-1',
        nome: 'Combo Família',
        descricao: null,
        precoBundle: 2500,
        imagemUrl: null,
        itens: [
          { produtoId: 'prod-1', quantidade: 1 },
          { produtoId: 'prod-2', quantidade: 1 },
        ],
      }

      const resultado = await useCase.execute(input)

      // Preço individual: 2500 + 500 = 3000
      // Preço bundle: 2500
      // Desconto: 3000 - 2500 = 500
      expect(resultado.calculoDesconto.precoIndividualTotal).toBe(3000)
      expect(resultado.calculoDesconto.precoBundle).toBe(2500)
      expect(resultado.calculoDesconto.valorDesconto).toBe(500)
    })

    it('deve lançar erro quando combo é inválido após validação', async () => {
      // Criar produto com preço zero para forçar validação inválida
      const produto1 = criarMockProduto('prod-1', 'Item', 0)

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1])

      const comboPersistido = new Combo({
        id: 'combo-1',
        restauranteId: 'rest-1',
        nome: 'Combo',
        descricao: null,
        precoBundle: Dinheiro.criar(0),
        imagemUrl: null,
        itens: [{ produtoId: 'prod-1', quantidade: 1 }],
        ativo: true,
      })
      mockItemCardapioRepo.salvar.mockResolvedValue(comboPersistido as unknown as ItemCardapio)

      const input: CriarComboInput = {
        restauranteId: 'rest-1',
        nome: 'Combo',
        descricao: null,
        precoBundle: 0,
        imagemUrl: null,
        itens: [{ produtoId: 'prod-1', quantidade: 1 }],
      }

      // A validação de ComboAggregate verifica itens com preço > 0
      await expect(useCase.execute(input)).rejects.toThrow(/Combo inválido/)
    })

    it('deve disparar evento CardapioAtualizadoEvent após criar combo', async () => {
      const produto1 = criarMockProduto('prod-1', 'Hambúrguer', 2500)

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1])

      const comboPersistido = new Combo({
        id: 'combo-1',
        restauranteId: 'rest-1',
        nome: 'Combo',
        descricao: null,
        precoBundle: Dinheiro.criar(2200),
        imagemUrl: null,
        itens: [{ produtoId: 'prod-1', quantidade: 1 }],
        ativo: true,
      })
      mockItemCardapioRepo.salvar.mockResolvedValue(comboPersistido as unknown as ItemCardapio)

      const input: CriarComboInput = {
        restauranteId: 'rest-1',
        nome: 'Combo',
        descricao: null,
        precoBundle: 2200,
        imagemUrl: null,
        itens: [{ produtoId: 'prod-1', quantidade: 1 }],
      }

      await useCase.execute(input)

      expect(mockEventDispatcher.dispatch).toHaveBeenCalled()
      const evento = mockEventDispatcher.dispatch.mock.calls[0][0]
      expect(evento.payload.tipoAlteracao).toBe('combo_criado')
    })
  })
})
