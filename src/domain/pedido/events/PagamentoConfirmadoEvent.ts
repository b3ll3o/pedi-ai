import { DomainEvent } from '@/domain/shared';
import { Pedido } from '../entities/Pedido';
import { MetodoPagamento } from '../value-objects/MetodoPagamento';
import { Dinheiro } from '../value-objects/Dinheiro';

export class PagamentoConfirmadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'PagamentoConfirmadoEvent';

  constructor(
    public readonly pedido: Pedido,
    public readonly metodoPagamento: MetodoPagamento,
    public readonly valorPago: Dinheiro,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
