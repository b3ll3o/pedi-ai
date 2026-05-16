import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CriarPedidoFromInputUseCase } from '@/application/pedido/services/CriarPedidoFromInputUseCase';
import type { CriarPedidoFromInputInput } from '@/application/pedido/services/CriarPedidoFromInputUseCase';
import { Pedido } from '@/domain/pedido/entities/Pedido';

describe('CriarPedidoFromInputUseCase', () => {
  let useCase: CriarPedidoFromInputUseCase;
  let mockPedidoRepo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPedidoRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByClienteId: vi.fn(),
      findByMesaId: vi.fn(),
      findByRestauranteId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    useCase = new CriarPedidoFromInputUseCase(mockPedidoRepo);
  });

  describe('execute', () => {
    it('deve criar pedido com sucesso a partir de input da API', async () => {
      // Arrange
      const input: CriarPedidoFromInputInput = {
        restauranteId: 'restaurante-123',
        mesaId: 'mesa-789',
        clienteId: 'cliente-456',
        itens: [
          {
            produtoId: 'produto-1',
            nome: 'Pizza Margherita',
            precoUnitario: 4500,
            quantidade: 2,
            observacao: 'Sem cebola',
          },
        ],
      };

      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('received');
      expect(resultado.createdAt).toBeDefined();
      expect(mockPedidoRepo.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar pedido com modificadores', async () => {
      // Arrange
      const input: CriarPedidoFromInputInput = {
        restauranteId: 'restaurante-123',
        mesaId: 'mesa-789',
        itens: [
          {
            produtoId: 'produto-1',
            nome: 'Hambúrguer',
            precoUnitario: 2500,
            quantidade: 1,
            modificadores: [
              {
                grupoId: 'grupo-1',
                grupoNome: 'Adicionais',
                modificadorId: 'mod-1',
                modificadorNome: 'Bacon',
                precoAdicional: 500,
              },
            ],
          },
        ],
      };

      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('received');
      expect(mockPedidoRepo.create).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro quando restauranteId não fornecido', async () => {
      // Arrange
      const input = {
        restauranteId: '',
        mesaId: 'mesa-789',
        itens: [{ produtoId: 'p1', nome: 'X', precoUnitario: 1000, quantidade: 1 }],
      } as CriarPedidoFromInputInput;

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('restauranteId é obrigatório');
    });

    it('deve lançar erro quando mesaId não fornecido', async () => {
      // Arrange
      const input = {
        restauranteId: 'rest-123',
        mesaId: '',
        itens: [{ produtoId: 'p1', nome: 'X', precoUnitario: 1000, quantidade: 1 }],
      } as CriarPedidoFromInputInput;

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('mesaId é obrigatório');
    });

    it('deve lançar erro quando itens está vazio', async () => {
      // Arrange
      const input: CriarPedidoFromInputInput = {
        restauranteId: 'rest-123',
        mesaId: 'mesa-789',
        itens: [],
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('itens não pode ser vazio');
    });

    it('deve lançar erro quando itens é null', async () => {
      // Arrange
      const input = {
        restauranteId: 'rest-123',
        mesaId: 'mesa-789',
        itens: null,
      } as unknown as CriarPedidoFromInputInput;

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('itens não pode ser vazio');
    });

    it('deve permitir clienteId opcional', async () => {
      // Arrange
      const input: CriarPedidoFromInputInput = {
        restauranteId: 'restaurante-123',
        mesaId: 'mesa-789',
        itens: [
          {
            produtoId: 'produto-1',
            nome: 'Suco',
            precoUnitario: 800,
            quantidade: 1,
          },
        ],
      };

      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.id).toBeDefined();
      expect(mockPedidoRepo.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar pedido sem modificadores', async () => {
      // Arrange
      const input: CriarPedidoFromInputInput = {
        restauranteId: 'restaurante-123',
        mesaId: 'mesa-789',
        itens: [
          {
            produtoId: 'produto-1',
            nome: 'Água',
            precoUnitario: 500,
            quantidade: 3,
          },
        ],
      };

      mockPedidoRepo.create.mockImplementation(async (pedido: Pedido) => pedido);

      // Act
      const resultado = await useCase.execute(input);

      // Assert
      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('received');
      expect(mockPedidoRepo.create).toHaveBeenCalledTimes(1);
    });
  });
});
