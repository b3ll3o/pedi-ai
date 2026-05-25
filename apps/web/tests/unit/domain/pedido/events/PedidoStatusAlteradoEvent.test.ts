import { describe, it, expect } from 'vitest';
import { PedidoStatusAlteradoEvent } from '@/domain/pedido/events/PedidoStatusAlteradoEvent';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('PedidoStatusAlteradoEvent', () => {
  it('deve criar evento com data atual se nao fornecida', () => {
    const { pedido } = criarPedidoComStatus();
    const event = new PedidoStatusAlteradoEvent(
      pedido,
      StatusPedido.RECEIVED,
      StatusPedido.PREPARING
    );

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.eventType).toBe('PedidoStatusAlteradoEvent');
    expect(event.pedido).toBe(pedido);
  });

  it('deve armazenar status anterior e novo', () => {
    const { pedido } = criarPedidoComStatus();
    const event = new PedidoStatusAlteradoEvent(
      pedido,
      StatusPedido.RECEIVED,
      StatusPedido.PREPARING
    );

    expect(event.statusAnterior).toEqual(StatusPedido.RECEIVED);
    expect(event.statusNovo).toEqual(StatusPedido.PREPARING);
  });
});

function criarPedidoComStatus(): { pedido: Pedido } {
  const item = ItemPedido.criar({
    id: 'item-1',
    produtoId: 'prod-1',
    nome: 'Produto',
    quantidade: 1,
    precoUnitario: Dinheiro.criar(1000),
    modificadoresSelecionados: [],
  });

  const pedido = Pedido.criar({
    id: 'pedido-1',
    restauranteId: 'rest-1',
    clienteId: 'cliente-1',
    status: StatusPedido.RECEIVED,
    itens: [item],
  });

  return { pedido };
}
