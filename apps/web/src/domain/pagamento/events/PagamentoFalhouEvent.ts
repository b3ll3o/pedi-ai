import { DomainEvent } from '@/domain/shared';
import { Pagamento } from '../entities/Pagamento';

export class PagamentoFalhouEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'PagamentoFalhouEvent';

  constructor(
    public readonly pagamento: Pagamento,
    public readonly motivo?: string,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
