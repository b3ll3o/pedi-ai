import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListarCardapioUseCase } from '@/application/cardapio/services/ListarCardapioUseCase';
import type { ICategoriaRepository, IItemCardapioRepository } from '@/domain/cardapio';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';

describe('ListarCardapioUseCase', () => {
  let useCase: ListarCardapioUseCase;
  let mockCategoriaRepo: ICategoriaRepository;
  let mockItemCardapioRepo: IItemCardapioRepository;

  const criarCategoria = (id: string, nome: string, ordem: number): Categoria => {
    return Categoria.reconstruir({
      id,
      restauranteId: 'restaurante-1',
      nome,
      descricao: null,
      imagemUrl: null,
      ordemExibicao: ordem,
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      deletedAt: null,
      version: 1,
    });
  };

  const criarItemCardapio = (id: string, nome: string, categoriaId: string, preco: number): ItemCardapio => {
    return ItemCardapio.reconstruir({
      id,
      categoriaId,
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoriaRepo = {
      buscarPorId: vi.fn(),
      buscarPorRestaurante: vi.fn(),
      buscarAtivas: vi.fn(),
      salvar: vi.fn(),
      salvarMany: vi.fn(),
      excluir: vi.fn(),
    };
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
    useCase = new ListarCardapioUseCase(mockCategoriaRepo, mockItemCardapioRepo);
  });

  describe('execute', () => {
    it('deve retornar cardápio completo com categorias e itens ordenados', async () => {
      // Arrange
      const cat1 = criarCategoria('cat-1', 'Bebidas', 1);
      const cat2 = criarCategoria('cat-2', 'Pratos', 0);

      const item1 = criarItemCardapio('item-1', 'Refrigerante', 'cat-1', 500);
      const item2 = criarItemCardapio('item-2', 'Suco', 'cat-1', 700);
      const item3 = criarItemCardapio('item-3', 'Arroz', 'cat-2', 1500);

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2]);
      mockItemCardapioRepo.buscarAtivos
        .mockResolvedValueOnce([item1, item2]) // cat-1
        .mockResolvedValueOnce([item3]);        // cat-2

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado.categorias).toHaveLength(2);
      // Categorias devem estar ordenadas por ordemExibicao (cat-2 vem primeiro)
      expect(resultado.categorias[0].categoria.nome).toBe('Pratos');
      expect(resultado.categorias[1].categoria.nome).toBe('Bebidas');
      // Itens devem estar ordenados alfabeticamente
      expect(resultado.categorias[1].itens[0].nome).toBe('Refrigerante');
      expect(resultado.categorias[1].itens[1].nome).toBe('Suco');
    });

    it('deve chamar buscarAtivas com restauranteId correto', async () => {
      // Arrange
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([]);

      // Act
      await useCase.execute({ restauranteId: 'restaurante-xyz' });

      // Assert
      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('restaurante-xyz');
    });

    it('deve chamar buscarAtivos para cada categoria', async () => {
      // Arrange
      const cat1 = criarCategoria('cat-1', 'Bebidas', 0);
      const cat2 = criarCategoria('cat-2', 'Pratos', 1);
      const cat3 = criarCategoria('cat-3', 'Sobremesas', 2);

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2, cat3]);
      mockItemCardapioRepo.buscarAtivos.mockResolvedValue([]);

      // Act
      await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(mockItemCardapioRepo.buscarAtivos).toHaveBeenCalledTimes(3);
      expect(mockItemCardapioRepo.buscarAtivos).toHaveBeenCalledWith('cat-1');
      expect(mockItemCardapioRepo.buscarAtivos).toHaveBeenCalledWith('cat-2');
      expect(mockItemCardapioRepo.buscarAtivos).toHaveBeenCalledWith('cat-3');
    });

    it('deve retornar cardápio vazio quando não há categorias', async () => {
      // Arrange
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado.categorias).toHaveLength(0);
      expect(mockItemCardapioRepo.buscarAtivos).not.toHaveBeenCalled();
    });

    it('deve retornar categoria sem itens quando categoria não tem itens ativos', async () => {
      // Arrange
      const cat1 = criarCategoria('cat-1', 'Bebidas', 0);
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1]);
      mockItemCardapioRepo.buscarAtivos.mockResolvedValue([]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado.categorias).toHaveLength(1);
      expect(resultado.categorias[0].categoria.nome).toBe('Bebidas');
      expect(resultado.categorias[0].itens).toHaveLength(0);
    });

    it('deve ordenar itens alfabeticamente por nome', async () => {
      // Arrange
      const cat1 = criarCategoria('cat-1', 'Bebidas', 0);
      const itemZ = criarItemCardapio('item-z', 'Zebra', 'cat-1', 1000);
      const itemA = criarItemCardapio('item-a', 'Abacaxi', 'cat-1', 500);
      const itemM = criarItemCardapio('item-m', 'Morango', 'cat-1', 700);

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1]);
      mockItemCardapioRepo.buscarAtivos.mockResolvedValue([itemZ, itemA, itemM]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado.categorias[0].itens[0].nome).toBe('Abacaxi');
      expect(resultado.categorias[0].itens[1].nome).toBe('Morango');
      expect(resultado.categorias[0].itens[2].nome).toBe('Zebra');
    });

    it('deve ordenar categorias por ordemExibicao crescente', async () => {
      // Arrange
      const cat5 = criarCategoria('cat-5', 'Quinta', 5);
      const cat1 = criarCategoria('cat-1', 'Primeira', 1);
      const cat3 = criarCategoria('cat-3', 'Terceira', 3);

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat5, cat1, cat3]);
      mockItemCardapioRepo.buscarAtivos.mockResolvedValue([]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado.categorias[0].categoria.ordemExibicao).toBe(1);
      expect(resultado.categorias[1].categoria.ordemExibicao).toBe(3);
      expect(resultado.categorias[2].categoria.ordemExibicao).toBe(5);
    });
  });
});
