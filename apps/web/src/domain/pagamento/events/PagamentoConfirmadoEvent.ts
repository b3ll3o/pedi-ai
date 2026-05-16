import { DomainEvent } from '@/domain/shared';
import { Pagamento } from '../entities/Pagamento';

export class PagamentoConfirmadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'PagamentoConfirmadoEvent';

  constructor(
    public readonly pagamento: Pagamento,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
