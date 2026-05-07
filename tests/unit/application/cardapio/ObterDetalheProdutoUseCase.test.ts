import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ObterDetalheProdutoUseCase } from '@/application/cardapio/services/ObterDetalheProdutoUseCase'
import type { IItemCardapioRepository } from '@/domain/cardapio/repositories/IItemCardapioRepository'
import type { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository'
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio'
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo'
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio'
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico'

describe('ObterDetalheProdutoUseCase', () => {
  let useCase: ObterDetalheProdutoUseCase
  let mockItemCardapioRepo: IItemCardapioRepository
  let mockModificadorGrupoRepo: IModificadorGrupoRepository

  const criarMockProduto = (id: string, nome: string, precoEmCentavos: number) => {
    return new ItemCardapio({
      id,
      categoriaId: 'cat-1',
      restauranteId: 'rest-1',
      nome,
      descricao: 'Descrição do produto',
      preco: Dinheiro.criar(precoEmCentavos),
      imagemUrl: 'https://exemplo.com/imagem.jpg',
      tipo: TipoItemCardapio.PRODUTO,
      labelsDieteticos: [],
      ativo: true,
    })
  }

  const criarMockModificadorGrupo = (
    id: string,
    produtoId: string,
    nome: string,
    valores: Array<{ id: string; nome: string; ativo: boolean }>
  ) => {
    const grupo = new ModificadorGrupo({
      id,
      restauranteId: 'rest-1',
      nome,
      obrigatorio: false,
      minSelecoes: 0,
      maxSelecoes: 3,
      valores: valores.map((v) =>
        new ModificadorValor({
          id: v.id,
          modificadorGrupoId: id,
          restauranteId: 'rest-1',
          nome: v.nome,
          ajustePreco: Dinheiro.criar(100),
          ativo: v.ativo,
        })
      ),
      ativo: true,
    })
    return grupo
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

    mockModificadorGrupoRepo = {
      buscarPorId: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarPorProduto: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    }

    useCase = new ObterDetalheProdutoUseCase(mockItemCardapioRepo, mockModificadorGrupoRepo)
  })

  describe('execute', () => {
    it('deve retornar detalhes do produto com modificadores ativos', async () => {
      const produto = criarMockProduto('prod-1', 'Hambúrguer', 2500)
      const grupo = criarMockModificadorGrupo('grp-1', 'prod-1', 'Adicionais', [
        { id: 'val-1', nome: 'Bacon', ativo: true },
        { id: 'val-2', nome: 'Queijo Extra', ativo: true },
      ])

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto)
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([grupo])

      const resultado = await useCase.execute({ produtoId: 'prod-1' })

      expect(resultado.produto).toEqual(produto)
      expect(resultado.produto.nome).toBe('Hambúrguer')
      expect(resultado.modificadores).toHaveLength(1)
      expect(resultado.modificadores[0].nome).toBe('Adicionais')
    })

    it('deve lançar erro quando produto não existe', async () => {
      mockItemCardapioRepo.buscarPorId.mockResolvedValue(null)

      await expect(useCase.execute({ produtoId: 'nao-existe' })).rejects.toThrow(
        'Produto nao-existe não encontrado'
      )
    })

    it('deve filtrar modificadores sem valores ativos', async () => {
      const produto = criarMockProduto('prod-1', 'Hambúrguer', 2500)
      const grupoComAtivos = criarMockModificadorGrupo('grp-1', 'prod-1', 'Adicionais Ativos', [
        { id: 'val-1', nome: 'Bacon', ativo: true },
        { id: 'val-2', nome: 'Queijo', ativo: true },
      ])
      const grupoSemAtivos = criarMockModificadorGrupo('grp-2', 'prod-1', 'Opções Inativas', [
        { id: 'val-3', nome: 'Inativo 1', ativo: false },
        { id: 'val-4', nome: 'Inativo 2', ativo: false },
      ])

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto)
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([grupoComAtivos, grupoSemAtivos])

      const resultado = await useCase.execute({ produtoId: 'prod-1' })

      expect(resultado.modificadores).toHaveLength(1)
      expect(resultado.modificadores[0].nome).toBe('Adicionais Ativos')
    })

    it('deve retornar array vazio de modificadores quando produto não tem modificadores', async () => {
      const produto = criarMockProduto('prod-1', 'Água', 300)

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto)
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([])

      const resultado = await useCase.execute({ produtoId: 'prod-1' })

      expect(resultado.produto.nome).toBe('Água')
      expect(resultado.modificadores).toEqual([])
    })

    it('deve chamar repositórios com os parâmetros corretos', async () => {
      const produto = criarMockProduto('prod-xyz', 'Pizza', 4500)
      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto)
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([])

      await useCase.execute({ produtoId: 'prod-xyz' })

      expect(mockItemCardapioRepo.buscarPorId).toHaveBeenCalledWith('prod-xyz')
      expect(mockModificadorGrupoRepo.buscarPorProduto).toHaveBeenCalledWith('prod-xyz')
    })

    it('deve incluir dados completos do produto no resultado', async () => {
      const produto = new ItemCardapio({
        id: 'prod-1',
        categoriaId: 'cat-1',
        restauranteId: 'rest-1',
        nome: 'X-Tudo',
        descricao: 'Hambúrguer completo',
        preco: Dinheiro.criar(3500),
        imagemUrl: 'https://exemplo.com/xtudo.jpg',
        tipo: TipoItemCardapio.PRODUTO,
        labelsDieteticos: [LabelDietetico.VEGANO as any],
        ativo: true,
      })

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto)
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([])

      const resultado = await useCase.execute({ produtoId: 'prod-1' })

      expect(resultado.produto.id).toBe('prod-1')
      expect(resultado.produto.nome).toBe('X-Tudo')
      expect(resultado.produto.preco.valor).toBe(3500)
      expect(resultado.produto.descricao).toBe('Hambúrguer completo')
    })

    it('deve lidar com modificador que tem alguns valores ativos e outros inativos', async () => {
      const produto = criarMockProduto('prod-1', 'Sanduíche', 2000)
      const grupo = criarMockModificadorGrupo('grp-1', 'prod-1', 'Personalizar', [
        { id: 'val-1', nome: 'Sem Cebola', ativo: true },
        { id: 'val-2', nome: 'Sem Tomate', ativo: false },
        { id: 'val-3', nome: 'Sem Alface', ativo: true },
      ])

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto)
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([grupo])

      const resultado = await useCase.execute({ produtoId: 'prod-1' })

      // Grupo tem valores ativos, então deve ser retornado
      expect(resultado.modificadores).toHaveLength(1)
      // Mas a filtragem é por grupo.ValoresAtivos.length > 0, então o grupo ainda aparece
      expect(resultado.modificadores[0].valoresAtivos).toHaveLength(2)
    })
  })
})
