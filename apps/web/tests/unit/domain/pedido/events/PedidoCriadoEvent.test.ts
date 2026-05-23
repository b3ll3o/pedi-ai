import { describe, it, expect } from 'vitest';
import { PedidoCriadoEvent } from '@/domain/pedido/events/PedidoCriadoEvent';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('PedidoCriadoEvent', () => {
  it('deve criar evento com data atual se não fornecida', () => {
    const pedido = criarPedido();
    const event = new PedidoCriadoEvent(pedido);

    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.eventType).toBe('PedidoCriadoEvent');
    expect(event.pedido).toBe(pedido);
  });

  it('deve usar data fornecida', () => {
    const pedido = criarPedido();
    const dataPersonalizada = new Date('2024-01-01');
    const event = new PedidoCriadoEvent(pedido, dataPersonalizada);

    expect(event.occurredOn).toEqual(dataPersonalizada);
  });
});

function criarPedido(): Pedido {
  const item = ItemPedido.criar({
    id: 'item-1',
    produtoId: 'prod-1',
    nome: 'Produto',
    quantidade: 1,
    precoUnitario: Dinheiro.criar(1000),
    modificadoresSelecionados: [],
  });

  return Pedido.criar({
    id: 'pedido-1',
    restauranteId: 'rest-1',
    clienteId: 'cliente-1',
    status: StatusPedido.RECEIVED,
    itens: [item],
  });
}