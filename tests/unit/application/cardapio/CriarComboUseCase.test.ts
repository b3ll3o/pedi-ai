import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CriarComboUseCase } from '@/application/cardapio/services/CriarComboUseCase';
import type { CriarComboInput } from '@/application/cardapio/services/CriarComboUseCase';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { EventDispatcher } from '@/domain/shared/events/EventDispatcher';

// Mock do EventDispatcher
vi.mock('@/domain/shared/events/EventDispatcher', () => {
  const mockDispatch = vi.fn();
  return {
    EventDispatcher: {
      getInstance: vi.fn(() => ({
        dispatch: mockDispatch,
        register: vi.fn(),
        unregister: vi.fn(),
      })),
    },
  };
});

describe('CriarComboUseCase', () => {
  let useCase: CriarComboUseCase;
  let mockItemCardapioRepo: any;
  let mockComboRepo: any;
  let mockEventDispatcher: EventDispatcher;

  const criarItemCardapio = (id: string, nome: string, preco: number): ItemCardapio => {
    return new ItemCardapio({
      id,
      categoriaId: 'categoria-1',
      restauranteId: 'restaurante-1',
      nome,
      descricao: `Descrição de ${nome}`,
      preco: Dinheiro.criar(preco),
      imagemUrl: null,
      tipo: TipoItemCardapio.PRODUTO,
      labelsDieteticos: [],
      ativo: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockItemCardapioRepo = {
      buscarPorIds: vi.fn(),
      salvar: vi.fn(),
    };

    mockComboRepo = {
      buscarPorIds: vi.fn(),
      salvar: vi.fn(),
    };

    mockEventDispatcher = EventDispatcher.getInstance();
    useCase = new CriarComboUseCase(mockItemCardapioRepo, mockComboRepo, mockEventDispatcher);
  });

  describe('execute', () => {
    it('deve criar combo com dados válidos', async () => {
      // Arrange
      const produto1 = criarItemCardapio('produto-1', 'Hambúrguer', 2500);
      const produto2 = criarItemCardapio('produto-2', 'Refrigerante', 500);

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1, produto2]);
      mockItemCardapioRepo.salvar.mockImplementation(async (combo: any) => ({
        ...combo,
        id: combo.id || 'combo-gerado',
      }));

      const input: CriarComboInput = {
        restauranteId: 'restaurante-1',
        nome: 'Combo Família',
        descricao: 'Combo com hambúrguer e refrigerante',
        precoBundle: 2500,
        imagemUrl: null,
        itens: [
          { produtoId: 'produto-1', quantidade: 1 },
          { produtoId: 'produto-2', quantidade: 1 },
        ],
      };

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.combo).toBeDefined();
      expect(resultado.combo.nome).toBe('Combo Família');
      expect(resultado.calculoDesconto).toBeDefined();
      expect(mockItemCardapioRepo.salvar).toHaveBeenCalled();
      expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
    });

    it('deve lançar erro quando combo não tem itens', async () => {
      // Arrange
      const input: CriarComboInput = {
        restauranteId: 'restaurante-1',
        nome: 'Combo Vazio',
        descricao: null,
        precoBundle: 1000,
        imagemUrl: null,
        itens: [],
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Combo deve ter pelo menos um item');
    });

    it('deve lançar erro quando produtos não são encontrados', async () => {
      // Arrange
      const produto1 = criarItemCardapio('produto-1', 'Hambúrguer', 2500);
      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1]);

      const input: CriarComboInput = {
        restauranteId: 'restaurante-1',
        nome: 'Combo Família',
        descricao: null,
        precoBundle: 2500,
        imagemUrl: null,
        itens: [
          { produtoId: 'produto-1', quantidade: 1 },
          { produtoId: 'produto-2', quantidade: 1 },
        ],
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Produtos não encontrados: produto-2');
    });

    it('deve lançar erro quando nenhum produto é encontrado', async () => {
      // Arrange
      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([]);

      const input: CriarComboInput = {
        restauranteId: 'restaurante-1',
        nome: 'Combo Família',
        descricao: null,
        precoBundle: 2500,
        imagemUrl: null,
        itens: [
          { produtoId: 'produto-1', quantidade: 1 },
          { produtoId: 'produto-2', quantidade: 1 },
        ],
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Produtos não encontrados: produto-1, produto-2');
    });

    it('deve calcular desconto corretamente', async () => {
      // Arrange
      const produto1 = criarItemCardapio('produto-1', 'Hambúrguer', 2500);
      const produto2 = criarItemCardapio('produto-2', 'Refrigerante', 500);

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1, produto2]);
      mockItemCardapioRepo.salvar.mockImplementation(async (combo: any) => ({
        ...combo,
        id: combo.id || 'combo-gerado',
      }));

      const input: CriarComboInput = {
        restauranteId: 'restaurante-1',
        nome: 'Combo Família',
        descricao: null,
        precoBundle: 2500, // R$ 25,00 - descontado
        imagemUrl: null,
        itens: [
          { produtoId: 'produto-1', quantidade: 1 },
          { produtoId: 'produto-2', quantidade: 1 },
        ],
      };

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      // Preço individual total = 2500 + 500 = 3000
      // Preço bundle = 2500
      // Desconto = 3000 - 2500 = 500
      expect(resultado.calculoDesconto.precoIndividualTotal).toBe(3000);
      expect(resultado.calculoDesconto.precoBundle).toBe(2500);
      expect(resultado.calculoDesconto.valorDesconto).toBe(500);
      expect(resultado.calculoDesconto.percentualDesconto).toBe(17); // 500/3000 = 16.67 ~= 17
    });

    it('deve disparar evento CardapioAtualizadoEvent', async () => {
      // Arrange
      const produto1 = criarItemCardapio('produto-1', 'Hambúrguer', 2500);

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1]);
      mockItemCardapioRepo.salvar.mockImplementation(async (combo: any) => ({
        ...combo,
        id: combo.id || 'combo-gerado',
      }));

      const input: CriarComboInput = {
        restauranteId: 'restaurante-1',
        nome: 'Combo Simples',
        descricao: null,
        precoBundle: 2000,
        imagemUrl: null,
        itens: [{ produtoId: 'produto-1', quantidade: 1 }],
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(mockEventDispatcher.dispatch).toHaveBeenCalledTimes(1);
      const eventoDispatched = (mockEventDispatcher.dispatch as any).mock.calls[0][0];
      expect(eventoDispatched.constructor.name).toBe('CardapioAtualizadoEvent');
      expect(eventoDispatched.props.tipoAlteracao).toBe('combo_criado');
      expect(eventoDispatched.props.restauranteId).toBe('restaurante-1');
    });

    it('deve salvar combo via repositório', async () => {
      // Arrange
      const produto1 = criarItemCardapio('produto-1', 'Hambúrguer', 2500);

      mockItemCardapioRepo.buscarPorIds.mockResolvedValue([produto1]);
      mockItemCardapioRepo.salvar.mockImplementation(async (combo: any) => combo);

      const input: CriarComboInput = {
        restauranteId: 'restaurante-1',
        nome: 'Combo Simples',
        descricao: 'Descrição do combo',
        precoBundle: 2000,
        imagemUrl: 'https://exemplo.com/combo.jpg',
        itens: [{ produtoId: 'produto-1', quantidade: 1 }],
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(mockItemCardapioRepo.salvar).toHaveBeenCalledTimes(1);
    });
  });
});
