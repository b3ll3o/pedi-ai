import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CriarPedidoUseCase } from '@/application/pedido/services/CriarPedidoUseCase';
import type { CriarPedidoInput } from '@/application/pedido/services/CriarPedidoUseCase';
import { CarrinhoAggregate } from '@/domain/pedido/aggregates/CarrinhoAggregate';
import { PedidoAggregate } from '@/domain/pedido/aggregates/PedidoAggregate';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
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

describe('CriarPedidoUseCase', () => {
  let useCase: CriarPedidoUseCase;
  let mockPedidoRepo: any;
  let mockCarrinhoRepo: any;
  let mockEventDispatcher: EventDispatcher;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPedidoRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockCarrinhoRepo = {
      get: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    };

    mockEventDispatcher = EventDispatcher.getInstance();
    useCase = new CriarPedidoUseCase(mockPedidoRepo, mockCarrinhoRepo, mockEventDispatcher);
  });

  describe('execute', () => {
    it('deve criar pedido com sucesso a partir do carrinho', async () => {
      // Arrange
      const itemPedido = ItemPedido.criar({
        produtoId: 'produto-123',
        nome: 'Pizza Margherita',
        quantidade: 2,
        precoUnitario: Dinheiro.criar(4500),
        observacao: null,
        modificadoresSelecionados: [],
      });

      const carrinho = CarrinhoAggregate.criar({
        id: 'carrinho-123',
        clienteId: 'cliente-456',
        mesaId: 'mesa-789',
        restauranteId: 'restaurante-123',
      });

      // Adicionar item ao carrinho via props interno
      (carrinho as any).props.itens = [itemPedido];

      mockCarrinhoRepo.get.mockResolvedValue(carrinho);
      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);
      mockCarrinhoRepo.clear.mockResolvedValue(undefined);

      const input: CriarPedidoInput = {
        clienteId: 'cliente-456',
        mesaId: 'mesa-789',
      };

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.pedido).toBeDefined();
      expect(resultado.pedido.clienteId).toBe('cliente-456');
      expect(resultado.pedido.mesaId).toBe('mesa-789');
      expect(mockPedidoRepo.create).toHaveBeenCalled();
      expect(mockCarrinhoRepo.clear).toHaveBeenCalled();
    });

    it('deve usar clienteId do input quando fornecido', async () => {
      // Arrange
      const itemPedido = ItemPedido.criar({
        produtoId: 'produto-123',
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(4500),
        observacao: null,
        modificadoresSelecionados: [],
      });

      const carrinho = CarrinhoAggregate.criar({
        id: 'carrinho-123',
        restauranteId: 'restaurante-123',
      });
      (carrinho as any).props.itens = [itemPedido];

      mockCarrinhoRepo.get.mockResolvedValue(carrinho);
      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      const input: CriarPedidoInput = {
        clienteId: 'novo-cliente-id',
      };

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.pedido.clienteId).toBe('novo-cliente-id');
    });

    it('deve usar mesaId do input quando fornecido', async () => {
      // Arrange
      const itemPedido = ItemPedido.criar({
        produtoId: 'produto-123',
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(4500),
        observacao: null,
        modificadoresSelecionados: [],
      });

      const carrinho = CarrinhoAggregate.criar({
        id: 'carrinho-123',
        restauranteId: 'restaurante-123',
      });
      (carrinho as any).props.itens = [itemPedido];

      mockCarrinhoRepo.get.mockResolvedValue(carrinho);
      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      const input: CriarPedidoInput = {
        mesaId: 'nova-mesa-id',
      };

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.pedido.mesaId).toBe('nova-mesa-id');
    });

    it('deve usar clienteId do carrinho quando input não fornecido', async () => {
      // Arrange
      const itemPedido = ItemPedido.criar({
        produtoId: 'produto-123',
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(4500),
        observacao: null,
        modificadoresSelecionados: [],
      });

      const carrinho = CarrinhoAggregate.criar({
        id: 'carrinho-123',
        clienteId: 'cliente-do-carrinho',
        restauranteId: 'restaurante-123',
      });
      (carrinho as any).props.itens = [itemPedido];

      mockCarrinhoRepo.get.mockResolvedValue(carrinho);
      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      const input: CriarPedidoInput = {};

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.pedido.clienteId).toBe('cliente-do-carrinho');
    });

    it('deve lançar erro quando carrinho não existe', async () => {
      // Arrange
      mockCarrinhoRepo.get.mockResolvedValue(null);

      const input: CriarPedidoInput = {};

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Carrinho não encontrado');
      expect(mockPedidoRepo.create).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando carrinho está vazio', async () => {
      // Arrange
      const carrinhoVazio = CarrinhoAggregate.criar({
        id: 'carrinho-vazio',
        restauranteId: 'restaurante-123',
      });

      mockCarrinhoRepo.get.mockResolvedValue(carrinhoVazio);

      const input: CriarPedidoInput = {};

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Não é possível criar pedido com carrinho vazio');
      expect(mockPedidoRepo.create).not.toHaveBeenCalled();
    });

    it('deve limpar carrinho após criar pedido', async () => {
      // Arrange
      const itemPedido = ItemPedido.criar({
        produtoId: 'produto-123',
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(4500),
        observacao: null,
        modificadoresSelecionados: [],
      });

      const carrinho = CarrinhoAggregate.criar({
        id: 'carrinho-123',
        restauranteId: 'restaurante-123',
      });
      (carrinho as any).props.itens = [itemPedido];

      mockCarrinhoRepo.get.mockResolvedValue(carrinho);
      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);
      mockCarrinhoRepo.clear.mockResolvedValue(undefined);

      const input: CriarPedidoInput = {};

      // Act
      await useCase.execute(input);

      // Assert
      expect(mockCarrinhoRepo.clear).toHaveBeenCalledTimes(1);
    });

    it('deve usar taxaServico zero quando não especificado', async () => {
      // Arrange
      const itemPedido = ItemPedido.criar({
        produtoId: 'produto-123',
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(1000), // R$ 10,00
        observacao: null,
        modificadoresSelecionados: [],
      });

      const carrinho = CarrinhoAggregate.criar({
        id: 'carrinho-123',
        restauranteId: 'restaurante-123',
      });
      (carrinho as any).props.itens = [itemPedido];

      mockCarrinhoRepo.get.mockResolvedValue(carrinho);
      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      const input: CriarPedidoInput = {};

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      // Taxa zero significa que total = subtotal
      expect(resultado.pedido.tax.valor).toBe(0);
    });
  });
});
