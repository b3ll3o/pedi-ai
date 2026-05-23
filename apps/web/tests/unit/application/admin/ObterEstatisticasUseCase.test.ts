import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObterEstatisticasUseCase, EstatisticasInput, Estatisticas } from '@/application/admin/services/ObterEstatisticasUseCase';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('ObterEstatisticasUseCase', () => {
  const criarPedidoMock = (id: string, status: StatusPedido, total: number, createdAt: Date) => ({
    id,
    status,
    total: Dinheiro.criar(total),
    createdAt,
  });

  const criarPagamentoMock = (id: string, status: StatusPagamento, valor: number) => ({
    id,
    status,
    valor: Dinheiro.criar(valor),
  });

  const mockPedidoRepo = {
    findByRestauranteId: vi.fn(),
  };

  const mockPagamentoRepo = {
    listarPorRestauranteId: vi.fn(),
  };

  const useCase = new ObterEstatisticasUseCase(mockPedidoRepo, mockPagamentoRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('deve calcular estatísticas para período de dia', async () => {
      const agora = new Date();
      const pedidos = [
        criarPedidoMock('p1', StatusPedido.PAID, 10000, agora),
        criarPedidoMock('p2', StatusPedido.DELIVERED, 5000, agora),
        criarPedidoMock('p3', StatusPedido.CANCELLED, 3000, agora),
      ];

      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);
      mockPagamentoRepo.listarPorRestauranteId.mockResolvedValue([]);

      const result = await useCase.execute({
        restauranteId: 'rest-1',
        periodo: 'dia',
      });

      expect(result.totalPedidos).toBe(3);
      expect(result.totalPagos).toBe(2);
      expect(result.totalCancelados).toBe(1);
      expect(result.totalFaturamento.valor).toBe(15000);
    });

    it('deve calcular ticket médio corretamente', async () => {
      const agora = new Date();
      const pedidos = [
        criarPedidoMock('p1', StatusPedido.PAID, 10000, agora),
        criarPedidoMock('p2', StatusPedido.DELIVERED, 20000, agora),
      ];

      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);
      mockPagamentoRepo.listarPorRestauranteId.mockResolvedValue([]);

      const result = await useCase.execute({
        restauranteId: 'rest-1',
        periodo: 'dia',
      });

      expect(result.ticketMedio.valor).toBe(15000);
    });

    it('deve retornar ZERO para ticket médio se não há pedidos pagos', async () => {
      const agora = new Date();
      const pedidos = [
        criarPedidoMock('p1', StatusPedido.CANCELLED, 10000, agora),
      ];

      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);
      mockPagamentoRepo.listarPorRestauranteId.mockResolvedValue([]);

      const result = await useCase.execute({
        restauranteId: 'rest-1',
        periodo: 'dia',
      });

      expect(result.ticketMedio).toEqual(Dinheiro.ZERO);
      expect(result.totalPagos).toBe(0);
    });

    it('deve filtrar pedidos por status', async () => {
      const agora = new Date();
      const pedidos = [
        criarPedidoMock('p1', StatusPedido.PAID, 10000, agora),
        criarPedidoMock('p2', StatusPedido.RECEIVED, 5000, agora),
      ];

      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);
      mockPagamentoRepo.listarPorRestauranteId.mockResolvedValue([]);

      const result = await useCase.execute({
        restauranteId: 'rest-1',
        periodo: 'dia',
      });

      expect(result.pedidosPorStatus['paid']).toBe(1);
      expect(result.pedidosPorStatus['received']).toBe(1);
    });

    it('deve contar reembolsos de pagamentos', async () => {
      const agora = new Date();
      const pedidos = [criarPedidoMock('p1', StatusPedido.PAID, 10000, agora)];
      const pagamentos = [
        criarPagamentoMock('pg1', StatusPagamento.CONFIRMED, 10000),
        criarPagamentoMock('pg2', StatusPagamento.REFUNDED, 5000),
      ];

      mockPedidoRepo.findByRestauranteId.mockResolvedValue(pedidos);
      mockPagamentoRepo.listarPorRestauranteId.mockResolvedValue(pagamentos);

      const result = await useCase.execute({
        restauranteId: 'rest-1',
        periodo: 'dia',
      });

      expect(result.totalReembolsados).toBe(1);
    });
  });
});