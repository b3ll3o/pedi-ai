import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObterDetalheProdutoUseCase } from '@/application/cardapio/services/ObterDetalheProdutoUseCase';
import type { IItemCardapioRepository, IModificadorGrupoRepository } from '@/domain/cardapio';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';

describe('ObterDetalheProdutoUseCase', () => {
  let useCase: ObterDetalheProdutoUseCase;
  let mockItemCardapioRepo: IItemCardapioRepository;
  let mockModificadorGrupoRepo: IModificadorGrupoRepository;

  const criarItemCardapio = (id: string, nome: string, preco: number): ItemCardapio => {
    return ItemCardapio.reconstruir({
      id,
      categoriaId: 'cat-1',
      restauranteId: 'restaurante-1',
      nome,
      descricao: null,
      preco: Dinheiro.criar(preco),
      imagemUrl: null,
      tipo: TipoItemCardapio.PRODUTO,
      labelsDieteticos: [],
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      deletedAt: null,
      version: 1,
    });
  };

  const criarModificadorGrupo = (id: string, nome: string, valores: ModificadorValor[], ativo: boolean = true): ModificadorGrupo => {
    return ModificadorGrupo.reconstruir({
      id,
      restauranteId: 'restaurante-1',
      nome,
      obrigatorio: false,
      minSelecoes: 0,
      maxSelecoes: 1,
      valores,
      ativo,
    });
  };

  const criarModificadorValor = (id: string, grupoId: string, nome: string, ativo: boolean = true): ModificadorValor => {
    return ModificadorValor.reconstruir({
      id,
      modificadorGrupoId: grupoId,
      restauranteId: 'restaurante-1',
      nome,
      ajustePreco: Dinheiro.criar(100),
      ativo,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockItemCardapioRepo = {
      buscarPorId: vi.fn(),
      buscarPorCategoria: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarAtivos: vi.fn(),
      buscarPorIds: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    };
    mockModificadorGrupoRepo = {
      buscarPorId: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarPorProduto: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    };
    useCase = new ObterDetalheProdutoUseCase(mockItemCardapioRepo, mockModificadorGrupoRepo);
  });

  describe('execute', () => {
    it('deve retornar detalhe do produto com modificadores ativos', async () => {
      // Arrange
      const produto = criarItemCardapio('produto-1', 'Hambúrguer', 2500);
      const valor1 = criarModificadorValor('val-1', 'grupo-1', 'Sem cebola', true);
      const valor2 = criarModificadorValor('val-2', 'grupo-1', 'Com bacon', true);
      const grupo = criarModificadorGrupo('grupo-1', 'Adicionais', [valor1, valor2]);

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto);
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([grupo]);

      // Act
      const resultado = await useCase.execute({ produtoId: 'produto-1' });

      // Assert
      expect(resultado.produto).toBe(produto);
      expect(resultado.produto.nome).toBe('Hambúrguer');
      expect(resultado.modificadores).toHaveLength(1);
      expect(resultado.modificadores[0].nome).toBe('Adicionais');
    });

    it('deve lançar erro quando produto não existe', async () => {
      // Arrange
      mockItemCardapioRepo.buscarPorId.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ produtoId: 'nao-existe' }))
        .rejects.toThrow('Produto nao-existe não encontrado');
    });

    it('deve chamar buscarPorId do repositório com produtoId correto', async () => {
      // Arrange
      const produto = criarItemCardapio('produto-123', 'Pizza', 3500);
      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto);
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([]);

      // Act
      await useCase.execute({ produtoId: 'produto-123' });

      // Assert
      expect(mockItemCardapioRepo.buscarPorId).toHaveBeenCalledWith('produto-123');
    });

    it('deve chamar buscarPorProduto do repositório após buscar produto', async () => {
      // Arrange
      const produto = criarItemCardapio('produto-1', 'Coca-Cola', 500);
      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto);
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([]);

      // Act
      await useCase.execute({ produtoId: 'produto-1' });

      // Assert
      expect(mockModificadorGrupoRepo.buscarPorProduto).toHaveBeenCalledWith('produto-1');
    });

    it('deve filtrar modificadores que não têm valores ativos', async () => {
      // Arrange
      const produto = criarItemCardapio('produto-1', 'Sanduíche', 1500);

      const valorAtivo = criarModificadorValor('val-ativo', 'grupo-1', 'Ativo', true);
      const valorInativo = criarModificadorValor('val-inativo', 'grupo-1', 'Inativo', false);

      const grupoComAtivos = criarModificadorGrupo('grupo-1', 'Grupo Ativo', [valorAtivo, valorInativo], true);
      const grupoVazio = criarModificadorGrupo('grupo-2', 'Grupo Vazio', [], true);
      const grupoInativo = criarModificadorGrupo('grupo-3', 'Grupo Inativo', [], false);

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto);
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([grupoComAtivos, grupoVazio, grupoInativo]);

      // Act
      const resultado = await useCase.execute({ produtoId: 'produto-1' });

      // Assert
      // grupoComAtivos tem valores ativos (1 valor ativo)
      // grupoVazio tem valoresAtivos.length = 0 → filtrado
      // grupoInativo tem ativo=false → filtrado por ativo mas também valoresAtivos.length=0
      expect(resultado.modificadores).toHaveLength(1);
      expect(resultado.modificadores[0].id).toBe('grupo-1');
    });

    it('deve retornar modificadores ativos ordenados', async () => {
      // Arrange
      const produto = criarItemCardapio('produto-1', 'X-Bacon', 3000);
      const valor1 = criarModificadorValor('val-1', 'grupo-1', 'Valor 1', true);
      const grupo1 = criarModificadorGrupo('grupo-1', 'Adicional 1', [valor1], true);
      const grupo2 = criarModificadorGrupo('grupo-2', 'Adicional 2', [], true);

      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto);
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([grupo1, grupo2]);

      // Act
      const resultado = await useCase.execute({ produtoId: 'produto-1' });

      // Assert
      expect(resultado.modificadores).toHaveLength(1);
    });

    it('deve retornar produto mesmo quando não há modificadores', async () => {
      // Arrange
      const produto = criarItemCardapio('produto-1', 'Água', 200);
      mockItemCardapioRepo.buscarPorId.mockResolvedValue(produto);
      mockModificadorGrupoRepo.buscarPorProduto.mockResolvedValue([]);

      // Act
      const resultado = await useCase.execute({ produtoId: 'produto-1' });

      // Assert
      expect(resultado.produto).toBe(produto);
      expect(resultado.produto.id).toBe('produto-1');
      expect(resultado.modificadores).toHaveLength(0);
    });
  });
});
