import { DomainEvent } from '@/domain/shared';
import { Pedido } from '../entities/Pedido';

export class PedidoCriadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'PedidoCriadoEvent';

  constructor(
    public readonly pedido: Pedido,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
