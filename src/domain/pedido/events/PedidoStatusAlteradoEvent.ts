import { DomainEvent } from '@/domain/shared';
import { Pedido } from '../entities/Pedido';
import { StatusPedido } from '../value-objects/StatusPedido';

export class PedidoStatusAlteradoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'PedidoStatusAlteradoEvent';

  constructor(
    public readonly pedido: Pedido,
    public readonly statusAnterior: StatusPedido,
    public readonly statusNovo: StatusPedido,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
