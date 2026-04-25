import { Pedido, PedidoProps } from '../entities/Pedido';
import { ItemPedido } from '../entities/ItemPedido';
import { StatusPedido } from '../value-objects/StatusPedido';
import { PedidoCriadoEvent } from '../events/PedidoCriadoEvent';
import { PedidoStatusAlteradoEvent } from '../events/PedidoStatusAlteradoEvent';
import { EventDispatcher } from '@/domain/shared';

export class PedidoAggregate {
  private pedido: Pedido;
  private eventDispatcher: EventDispatcher;

  constructor(pedido: Pedido, eventDispatcher?: EventDispatcher) {
    this.pedido = pedido;
    this.eventDispatcher = eventDispatcher ?? EventDispatcher.getInstance();
    this.validarInvariantes();
  }

  get id(): string {
    return this.pedido.id;
  }

  get pedidoEntity(): Pedido {
    return this.pedido;
  }

  get status(): StatusPedido {
    return this.pedido.status;
  }

  private validarInvariantes(): void {
    // Invariante 1: pedido deve ter pelo menos um item
    if (this.pedido.itens.length === 0) {
      throw new Error('Pedido deve ter pelo menos um item');
    }

    // Invariante 2: total deve ser igual a soma de subtotal + tax
    const calculoEsperado = this.pedido.subtotal.somar(this.pedido.tax);
    if (!calculoEsperado.equals(this.pedido.total)) {
      throw new Error('Total do pedido não corresponde à soma do subtotal com tax');
    }
  }

  adicionarItem(item: ItemPedido): void {
    this.pedido.adicionarItem(item);
    this.validarInvariantes();
  }

  removerItem(itemId: string): void {
    this.pedido.removerItem(itemId);
    this.validarInvariantes();
  }

  alterarStatus(novoStatus: StatusPedido): void {
    const statusAnterior = this.pedido.status;
    this.pedido.alterarStatus(novoStatus);

    const event = new PedidoStatusAlteradoEvent(this.pedido, statusAnterior, novoStatus);
    this.eventDispatcher.dispatch(event);
  }

  static criar(props: Omit<PedidoProps, 'createdAt' | 'updatedAt' | 'subtotal' | 'tax' | 'total'>): PedidoAggregate {
    const pedido = Pedido.criar(props);
    const aggregate = new PedidoAggregate(pedido);

    const event = new PedidoCriadoEvent(pedido);
    aggregate.eventDispatcher.dispatch(event);

    return aggregate;
  }

  static reconstruir(props: PedidoProps): PedidoAggregate {
    const pedido = new Pedido({ ...props });
    return new PedidoAggregate(pedido);
  }
}
