import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListarCategoriasUseCase } from '@/application/cardapio/services/ListarCategoriasUseCase';
import type { ICategoriaRepository } from '@/domain/cardapio/repositories/ICategoriaRepository';
import { Categoria } from '@/domain/cardapio/entities/Categoria';

describe('ListarCategoriasUseCase', () => {
  let useCase: ListarCategoriasUseCase;
  let mockCategoriaRepo: ICategoriaRepository;

  const criarCategoria = (id: string, nome: string, ordem: number, ativo: boolean = true): Categoria => {
    return Categoria.reconstruir({
      id,
      restauranteId: 'restaurante-1',
      nome,
      descricao: null,
      imagemUrl: null,
      ordemExibicao: ordem,
      ativo,
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
    useCase = new ListarCategoriasUseCase(mockCategoriaRepo);
  });

  describe('execute', () => {
    it('deve listar categorias ativas ordenadas por ordemExibicao', async () => {
      // Arrange
      const cat1 = criarCategoria('cat-1', 'Bebidas', 1);
      const cat2 = criarCategoria('cat-2', 'Pratos', 0);
      const cat3 = criarCategoria('cat-3', 'Sobremesas', 2);

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([cat1, cat2, cat3]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado).toHaveLength(3);
      expect(resultado[0].nome).toBe('Pratos');    // ordem 0
      expect(resultado[1].nome).toBe('Bebidas');   // ordem 1
      expect(resultado[2].nome).toBe('Sobremesas'); // ordem 2
      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('restaurante-1');
    });

    it('deve chamar buscarAtivas do repositório', async () => {
      // Arrange
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([]);

      // Act
      await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledTimes(1);
      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('restaurante-1');
    });

    it('deve retornar lista vazia quando não há categorias', async () => {
      // Arrange
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado).toEqual([]);
    });

    it('deve ordenar categorias por ordemExibicao crescente', async () => {
      // Arrange
      const catA = criarCategoria('cat-a', 'Zebra', 5);
      const catB = criarCategoria('cat-b', 'Abacaxi', 1);
      const catC = criarCategoria('cat-c', 'Maçã', 3);

      mockCategoriaRepo.buscarAtivas.mockResolvedValue([catA, catB, catC]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado[0].ordemExibicao).toBe(1);
      expect(resultado[1].ordemExibicao).toBe(3);
      expect(resultado[2].ordemExibicao).toBe(5);
    });

    it('deve retornar apenas categorias ativas', async () => {
      // Arrange — buscarAtivas já deve retornar só ativas, mas aseguramos
      const catAtiva = criarCategoria('cat-ativa', 'Ativa', 0, true);
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([catAtiva]);

      // Act
      const resultado = await useCase.execute({ restauranteId: 'restaurante-1' });

      // Assert
      expect(resultado.every(c => c.ativo)).toBe(true);
    });

    it('deve passar restauranteId correto para buscarAtivas', async () => {
      // Arrange
      mockCategoriaRepo.buscarAtivas.mockResolvedValue([]);

      // Act
      await useCase.execute({ restauranteId: 'restaurante-xyz' });

      // Assert
      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('restaurante-xyz');
    });
  });
});
