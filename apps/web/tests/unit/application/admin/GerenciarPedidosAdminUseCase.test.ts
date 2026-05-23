import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GerenciarPedidosAdminUseCase, FiltrosPedido } from '@/application/admin/services/GerenciarPedidosAdminUseCase';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('GerenciarPedidosAdminUseCase', () => {
  const criarItem = (id: string): ItemPedido => {
    return ItemPedido.criar({
      id,
      produtoId: 'prod-1',
      nome: 'Produto',
      quantidade: 1,
      precoUnitario: Dinheiro.criar(1000),
      modificadoresSelecionados: [],
    });
  };

  const criarPedido = (id: string, status: StatusPedido, restauranteId: string, mesaId?: string): Pedido => {
    return Pedido.criar({
      id,
      restauranteId,
      mesaId,
      status,
      itens: [criarItem(`item-${id}`)],
      tax: Dinheiro.ZERO,
    });
  };

  const mockPedidoRepo = {
    findByRestauranteId: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  };

  const useCase = new GerenciarPedidosAdminUseCase(mockPedidoRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('deve buscar pedidos sem filtros', async () => {
      const pedidos = [
        criarPedido('p1', StatusPedido.RECEIVED, 'rest-1'),
        criarPedido('p2', StatusPedido.PREPARING, 'rest-1'),
      ];
      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);

      const result = await useCase.execute({
        filtros: { restauranteId: 'rest-1' },
      });

      expect(result.pedidos).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('deve filtrar por status', async () => {
      const pedidos = [
        criarPedido('p1', StatusPedido.RECEIVED, 'rest-1'),
        criarPedido('p2', StatusPedido.PREPARING, 'rest-1'),
      ];
      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);

      const result = await useCase.execute({
        filtros: { restauranteId: 'rest-1', status: 'received' },
      });

      expect(result.pedidos).toHaveLength(1);
      expect(result.pedidos[0].status.toString()).toBe('received');
    });

    it('deve filtrar por clienteId', async () => {
      const pedidos = [
        criarPedido('p1', StatusPedido.RECEIVED, 'rest-1'),
      ];
      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);

      const result = await useCase.execute({
        filtros: { restauranteId: 'rest-1', clienteId: 'cliente-1' },
      });

      expect(result.total).toBe(0);
    });

    it('deve aplicar paginação', async () => {
      const pedidos = Array.from({ length: 10 }, (_, i) =>
        criarPedido(`p${i}`, StatusPedido.RECEIVED, 'rest-1')
      );
      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);

      const result = await useCase.execute({
        filtros: { restauranteId: 'rest-1', limite: 3, offset: 2 },
      });

      expect(result.pedidos).toHaveLength(3);
      expect(result.total).toBe(10);
    });

    it('deve usar limite padrão de 50', async () => {
      const pedidos = Array.from({ length: 100 }, (_, i) =>
        criarPedido(`p${i}`, StatusPedido.RECEIVED, 'rest-1')
      );
      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);

      const result = await useCase.execute({
        filtros: { restauranteId: 'rest-1' },
      });

      expect(result.pedidos).toHaveLength(50);
    });
  });

  describe('alterarStatus', () => {
    it('deve alterar status de um pedido', async () => {
      const pedido = criarPedido('p1', StatusPedido.RECEIVED, 'rest-1');
      mockPedidoRepo.findById.mockResolvedValue(pedido);
      mockPedidoRepo.update.mockResolvedValue(pedido);

      const result = await useCase.alterarStatus('p1', StatusPedido.PREPARING);

      expect(mockPedidoRepo.update).toHaveBeenCalled();
    });

    it('deve lançar erro se pedido não encontrado', async () => {
      mockPedidoRepo.findById.mockResolvedValue(null);

      await expect(useCase.alterarStatus('nao-existe', StatusPedido.PREPARING))
        .rejects.toThrow('Pedido não encontrado');
    });
  });
});