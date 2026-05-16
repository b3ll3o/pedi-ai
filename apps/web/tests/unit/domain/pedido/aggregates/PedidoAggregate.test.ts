import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PedidoAggregate } from '@/domain/pedido/aggregates/PedidoAggregate';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { EventDispatcher } from '@/domain/shared/events/EventDispatcher';

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

describe('PedidoAggregate', () => {
  let mockEventDispatcher: EventDispatcher;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventDispatcher = EventDispatcher.getInstance();
  });

  const criarItemPedido = (): ItemPedido => {
    return ItemPedido.criar({
      produtoId: 'produto-123',
      nome: 'Pizza Margherita',
      quantidade: 1,
      precoUnitario: Dinheiro.criar(4500),
      observacao: null,
      modificadoresSelecionados: [],
    });
  };

  const criarPedidoValido = (): Pedido => {
    const item = criarItemPedido();
    return Pedido.criar({
      id: crypto.randomUUID(),
      restauranteId: 'restaurante-123',
      clienteId: 'cliente-456',
      mesaId: 'mesa-789',
      status: StatusPedido.RECEIVED,
      itens: [item],
    });
  };

  describe('criação', () => {
    it('deve criar aggregate com status received', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      expect(aggregate.status).toEqual(StatusPedido.RECEIVED);
    });

    it('deve criar aggregate com PedidoAggregate.criar', () => {
      const aggregate = PedidoAggregate.criar({
        id: crypto.randomUUID(),
        restauranteId: 'restaurante-123',
        clienteId: 'cliente-456',
        mesaId: 'mesa-789',
        status: StatusPedido.RECEIVED,
        itens: [criarItemPedido()],
      });

      expect(aggregate.status).toEqual(StatusPedido.RECEIVED);
    });

    it('deve lançar erro se pedido não tem itens', () => {
      const pedidoSemItens = Pedido.criar({
        id: crypto.randomUUID(),
        restauranteId: 'restaurante-123',
        status: StatusPedido.RECEIVED,
        itens: [],
      });

      expect(() => new PedidoAggregate(pedidoSemItens, mockEventDispatcher)).toThrow(
        'Pedido deve ter pelo menos um item'
      );
    });

    it('deve despachar PedidoCriadoEvent ao criar aggregate', () => {
      const _aggregate = PedidoAggregate.criar({
        id: crypto.randomUUID(),
        restauranteId: 'restaurante-123',
        status: StatusPedido.RECEIVED,
        itens: [criarItemPedido()],
      });

      expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
      const event = (mockEventDispatcher.dispatch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(event.constructor.name).toBe('PedidoCriadoEvent');
    });
  });

  describe('alteração de status', () => {
    it('deve alterar status de received para preparing', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      aggregate.alterarStatus(StatusPedido.PREPARING);

      expect(aggregate.status).toEqual(StatusPedido.PREPARING);
    });

    it('deve alterar status de preparing para ready', () => {
      const pedido = criarPedidoValido();
      pedido.alterarStatus(StatusPedido.PREPARING);
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      aggregate.alterarStatus(StatusPedido.READY);

      expect(aggregate.status).toEqual(StatusPedido.READY);
    });

    it('deve alterar status de ready para delivered', () => {
      const pedido = criarPedidoValido();
      pedido.alterarStatus(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.READY);
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      aggregate.alterarStatus(StatusPedido.DELIVERED);

      expect(aggregate.status).toEqual(StatusPedido.DELIVERED);
    });

    it('deve permitir cancelamento de received', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      aggregate.alterarStatus(StatusPedido.CANCELLED);

      expect(aggregate.status).toEqual(StatusPedido.CANCELLED);
    });

    it('deve permitir cancelamento de preparing', () => {
      const pedido = criarPedidoValido();
      pedido.alterarStatus(StatusPedido.PREPARING);
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      aggregate.alterarStatus(StatusPedido.CANCELLED);

      expect(aggregate.status).toEqual(StatusPedido.CANCELLED);
    });

    it('deve permitir cancelamento de ready', () => {
      const pedido = criarPedidoValido();
      pedido.alterarStatus(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.READY);
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      aggregate.alterarStatus(StatusPedido.CANCELLED);

      expect(aggregate.status).toEqual(StatusPedido.CANCELLED);
    });

    it('não deve permitir transição received → paid (MVP sem pagamento)', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      expect(() => aggregate.alterarStatus(StatusPedido.PAID)).toThrow();
    });

    it('não deve permitir transição received → pending_payment (MVP sem pagamento)', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      expect(() => aggregate.alterarStatus(StatusPedido.PENDING_PAYMENT)).toThrow();
    });

    it('não deve permitir transição delivered → qualquer status (terminal)', () => {
      const pedido = criarPedidoValido();
      pedido.alterarStatus(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.DELIVERED);
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      expect(() => aggregate.alterarStatus(StatusPedido.CANCELLED)).toThrow();
      expect(() => aggregate.alterarStatus(StatusPedido.RECEIVED)).toThrow();
    });

    it('deve despachar PedidoStatusAlteradoEvent ao alterar status', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);
      vi.clearAllMocks();

      aggregate.alterarStatus(StatusPedido.PREPARING);

      expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
      const event = (mockEventDispatcher.dispatch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(event.constructor.name).toBe('PedidoStatusAlteradoEvent');
    });
  });

  describe('acesso ao Pedido interno', () => {
    it('deve expor id do pedido', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      expect(aggregate.id).toBe(pedido.id);
    });

    it('deve expor a entidade Pedido', () => {
      const pedido = criarPedidoValido();
      const aggregate = new PedidoAggregate(pedido, mockEventDispatcher);

      expect(aggregate.pedidoEntity).toBe(pedido);
    });
  });

  describe('reconstrução', () => {
    it('deve reconstruir aggregate a partir de props', () => {
      const item = criarItemPedido();
      const props = {
        id: crypto.randomUUID(),
        restauranteId: 'restaurante-123',
        status: StatusPedido.PREPARING as StatusPedido,
        itens: [item],
        subtotal: Dinheiro.ZERO,
        tax: Dinheiro.ZERO,
        total: Dinheiro.ZERO,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const _pedido = new Pedido({ ...props });

      const aggregate = PedidoAggregate.reconstruir(props);

      expect(aggregate.id).toBe(props.id);
      expect(aggregate.status).toEqual(StatusPedido.PREPARING);
    });
  });
});
